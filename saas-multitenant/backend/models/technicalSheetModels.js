const pool = require('../config/db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula custo total de uma ficha técnica com base nos ingredientes.
 * Retorna { totalCost, costPerUnit } onde "unit" = pessoa ou unidade de rendimento.
 */
function computeSheetCost(ingredients = [], baseYield = 1) {
  const totalCost = ingredients.reduce((s, ing) => {
    const qty      = Number(ing.quantity)  || 0;
    const cost     = Number(ing.unit_cost) || 0;
    const wastePct = Number(ing.waste_pct) || 0;
    return s + qty * cost * (1 + wastePct / 100);
  }, 0);
  const safeYield  = Number(baseYield) > 0 ? Number(baseYield) : 1;
  const costPerUnit = totalCost / safeYield;
  return { totalCost, costPerUnit };
}

// ─── CRUD: Fichas Técnicas ────────────────────────────────────────────────────

async function getAllSheets(tenant_id) {
  const result = await pool.query(
    `SELECT ts.*,
            COUNT(si.id) AS ingredient_count,
            COALESCE(SUM(si.quantity * si.unit_cost * (1 + si.waste_pct / 100)), 0) AS total_cost
     FROM technical_sheets ts
     LEFT JOIN sheet_ingredients si ON si.sheet_id = ts.id
     WHERE ts.tenant_id = $1
     GROUP BY ts.id
     ORDER BY ts.name ASC`,
    [tenant_id]
  );
  return result.rows;
}

async function getSheetDetail(sheetId, tenant_id) {
  const [sheetRes, ingRes] = await Promise.all([
    pool.query('SELECT * FROM technical_sheets WHERE id = $1 AND tenant_id = $2', [sheetId, tenant_id]),
    pool.query('SELECT * FROM sheet_ingredients WHERE sheet_id = $1 AND tenant_id = $2 ORDER BY id', [sheetId, tenant_id]),
  ]);
  if (!sheetRes.rows[0]) return null;
  const sheet = sheetRes.rows[0];
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

// Retorna custo escalado para um número de convidados (para o orçamento)
async function getSheetCostForGuests(sheetId, tenant_id, guestCount) {
  const sheet = await getSheetDetail(sheetId, tenant_id);
  if (!sheet) return null;
  const guests = Number(guestCount) || 0;
  const scaledCost = guests > 0 ? sheet.cost_per_unit * guests : 0;
  return {
    sheet_id:   sheet.id,
    sheet_name: sheet.name,
    base_yield: sheet.base_yield,
    yield_unit: sheet.yield_unit,
    cost_per_unit: sheet.cost_per_unit,
    total_cost: sheet.total_cost,
    scaled_cost: scaledCost,
  };
}

// ─── Ingredientes (internal helper) ──────────────────────────────────────────

async function _insertIngredients(client, sheetId, tenant_id, ingredients) {
  const q = `INSERT INTO sheet_ingredients (sheet_id, tenant_id, name, quantity, unit, unit_cost, waste_pct, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  for (const ing of ingredients) {
    await client.query(q, [
      sheetId, tenant_id,
      (ing.name || 'Ingrediente').trim(),
      Number(ing.quantity)  || 0,
      ing.unit   || 'unidade',
      Number(ing.unit_cost) || 0,
      Number(ing.waste_pct) || 0,
      ing.notes  || '',
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
};
