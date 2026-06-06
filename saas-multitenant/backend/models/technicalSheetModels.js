const pool = require('../config/db');

// ─── Conversão de unidades ────────────────────────────────────────────────────

/**
 * Converte uma quantidade de `fromUnit` para `toUnit`.
 * Retorna o valor convertido, ou null se as unidades forem incompatíveis.
 *
 * Regras implementadas:
 *   Massa:  g  ↔ kg   (1 kg = 1000 g)
 *   Volume: ml ↔ litro (1 litro = 1000 ml)
 *   Mesmo: qualquer unidade igual a si mesma
 *   Incompatível: retorna null (caller usa valor bruto)
 */
function convertUnits(value, fromUnit, toUnit) {
  const from = (fromUnit || '').toLowerCase().trim();
  const to   = (toUnit   || '').toLowerCase().trim();
  const v = Number(value) || 0;

  if (!from || !to || from === to) return v;

  // Massa
  if (from === 'g'     && to === 'kg')    return v / 1000;
  if (from === 'kg'    && to === 'g')     return v * 1000;

  // Volume
  if (from === 'ml'    && to === 'litro') return v / 1000;
  if (from === 'litro' && to === 'ml')    return v * 1000;

  // Expansão futura: pacote, caixa (precisam de fator customizado por ingrediente)
  // Por ora retorna null para indicar incompatibilidade

  return null; // unidades incompatíveis — caller usa o valor sem conversão
}

// ─── Cálculo de custo ─────────────────────────────────────────────────────────

/**
 * Calcula o custo total e custo por unidade de rendimento.
 *
 * Para cada ingrediente:
 *   - `quantity` (ing.quantity) + `unit` (ing.unit): quantidade usada na receita e sua unidade
 *   - `unit_cost` (ing.unit_cost): preço por unidade do campo `cost_unit`
 *   - `cost_unit` (ing.cost_unit || ing.unit): unidade em que o preço está cotado
 *   - `waste_pct`: % de perda
 *
 * Exemplo:
 *   Farinha: 500 g, custo R$ 4/kg
 *   → converte 500g → 0.5 kg → custo = 0.5 × 4 = R$ 2,00
 */
function computeSheetCost(ingredients = [], baseYield = 1) {
  const isDev = process.env.NODE_ENV !== 'production';

  const totalCost = ingredients.reduce((sum, ing) => {
    const qty      = Number(ing.quantity)  || 0;
    const cost     = Number(ing.unit_cost) || 0;
    const wastePct = Number(ing.waste_pct) || 0;
    const wasteMultiplier = 1 + wastePct / 100;

    const qtyUnit  = ing.unit      || 'unidade';
    const costUnit = ing.cost_unit || qtyUnit; // backward compat: sem cost_unit → mesma unidade

    let effectiveQty = qty;
    if (qtyUnit !== costUnit) {
      const converted = convertUnits(qty, qtyUnit, costUnit);
      if (converted !== null) {
        effectiveQty = converted;
      } else if (isDev) {
        console.warn(`[Sheet] Unidades incompatíveis: ${qtyUnit} → ${costUnit} (${ing.name || 'ingrediente'}). Usando quantidade bruta.`);
      }
    }

    return sum + effectiveQty * cost * wasteMultiplier;
  }, 0);

  const safeYield   = Number(baseYield) > 0 ? Number(baseYield) : 1;
  const costPerUnit = totalCost / safeYield;
  return { totalCost, costPerUnit };
}

// ─── CRUD: Fichas Técnicas ────────────────────────────────────────────────────

async function getAllSheets(tenant_id) {
  // O custo na listagem usa SQL sem conversão de unidades (aproximado).
  // O custo exato está em getSheetDetail (calculado em JS com conversão).
  const result = await pool.query(
    `SELECT ts.*, COUNT(si.id) AS ingredient_count
     FROM technical_sheets ts
     LEFT JOIN sheet_ingredients si ON si.sheet_id = ts.id
     WHERE ts.tenant_id = $1
     GROUP BY ts.id
     ORDER BY ts.name ASC`,
    [tenant_id]
  );
  // Busca custo correto (com conversão) para cada ficha
  const rows = await Promise.all(result.rows.map(async row => {
    const detail = await getSheetDetail(row.id, tenant_id);
    return { ...row, total_cost: detail ? detail.total_cost : 0, cost_per_unit: detail ? detail.cost_per_unit : 0 };
  }));
  return rows;
}

async function getSheetDetail(sheetId, tenant_id) {
  const [sheetRes, ingRes] = await Promise.all([
    pool.query('SELECT * FROM technical_sheets WHERE id = $1 AND tenant_id = $2', [sheetId, tenant_id]),
    pool.query('SELECT * FROM sheet_ingredients WHERE sheet_id = $1 AND tenant_id = $2 ORDER BY id', [sheetId, tenant_id]),
  ]);
  if (!sheetRes.rows[0]) return null;
  const sheet       = sheetRes.rows[0];
  const ingredients = ingRes.rows;
  const { totalCost, costPerUnit } = computeSheetCost(ingredients, sheet.base_yield);
  return { ...sheet, ingredients, total_cost: totalCost, cost_per_unit: costPerUnit };
}

async function createSheet({ tenant_id, name, category = 'outro', base_yield = 1, yield_unit = 'pessoas', notes = '', ingredients = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO technical_sheets (tenant_id, name, category, base_yield, yield_unit, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenant_id, name.trim(), category, Number(base_yield) || 1, yield_unit, notes]
    );
    const sheet = res.rows[0];
    if (ingredients.length > 0) {
      await _insertIngredients(client, sheet.id, tenant_id, ingredients);
    }
    await client.query('COMMIT');
    return getSheetDetail(sheet.id, tenant_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateSheet(sheetId, tenant_id, { name, category, base_yield, yield_unit, notes, ingredients }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE technical_sheets
       SET name=$1, category=$2, base_yield=$3, yield_unit=$4, notes=$5, updated_at=NOW()
       WHERE id=$6 AND tenant_id=$7`,
      [name?.trim(), category, Number(base_yield) || 1, yield_unit, notes, sheetId, tenant_id]
    );
    if (Array.isArray(ingredients)) {
      await client.query('DELETE FROM sheet_ingredients WHERE sheet_id=$1 AND tenant_id=$2', [sheetId, tenant_id]);
      if (ingredients.length > 0) {
        await _insertIngredients(client, sheetId, tenant_id, ingredients);
      }
    }
    await client.query('COMMIT');
    return getSheetDetail(sheetId, tenant_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteSheet(sheetId, tenant_id) {
  const result = await pool.query(
    'DELETE FROM technical_sheets WHERE id=$1 AND tenant_id=$2 RETURNING id',
    [sheetId, tenant_id]
  );
  return result.rowCount > 0;
}

/**
 * Retorna o custo escalado para uma determinada quantidade.
 * `quantity` é o número de convidados ou a quantidade do item no orçamento.
 */
async function getSheetCostForGuests(sheetId, tenant_id, quantity) {
  const sheet = await getSheetDetail(sheetId, tenant_id);
  if (!sheet) return null;
  const qty         = Number(quantity) || 0;
  const scaledCost  = qty > 0 ? sheet.cost_per_unit * qty : 0;
  return {
    sheet_id:      sheet.id,
    sheet_name:    sheet.name,
    base_yield:    sheet.base_yield,
    yield_unit:    sheet.yield_unit,
    cost_per_unit: sheet.cost_per_unit,
    total_cost:    sheet.total_cost,
    scaled_cost:   scaledCost,
  };
}

// ─── Ingredientes (internal helper) ──────────────────────────────────────────

async function _insertIngredients(client, sheetId, tenant_id, ingredients) {
  const q = `INSERT INTO sheet_ingredients
               (sheet_id, tenant_id, name, quantity, unit, unit_cost, cost_unit, waste_pct, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
  for (const ing of ingredients) {
    await client.query(q, [
      sheetId,
      tenant_id,
      (ing.name || 'Ingrediente').trim(),
      Number(ing.quantity)  || 0,
      ing.unit      || 'unidade',
      Number(ing.unit_cost) || 0,
      ing.cost_unit || null,    // null = mesma unidade que `unit` (backward compat)
      Number(ing.waste_pct) || 0,
      ing.notes     || '',
    ]);
  }
}

module.exports = {
  getAllSheets,
  getSheetDetail,
  createSheet,
  updateSheet,
  deleteSheet,
  getSheetCostForGuests,
  computeSheetCost,
  convertUnits,
};
