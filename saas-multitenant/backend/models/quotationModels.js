const pool = require('../config/db');

function safeNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCostArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeJSON(value) {
  return JSON.stringify(normalizeCostArray(value));
}

function priceFromMargin(cost, marginPct) {
  const amount = safeNumber(cost);
  const margin = safeNumber(marginPct);
  if (margin >= 100) return 0;
  if (margin <= 0) return amount;
  return amount / (1 - margin / 100);
}

function shouldPassToClient(cost) {
  return (
    cost.pass_to_client === true ||
    cost.pass_to_client === 'true' ||
    cost.pass_to_client === 1 ||
    cost.pass_to_client === '1'
  );
}

function computeQuotationTotal({
  items = [],
  fixed_costs = [],
  variable_costs = [],
  discount_percent = 0,
  guest_count = 0,
} = {}) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = safeNumber(item.quantity, 1);
    const price = safeNumber(item.price ?? item.unit_price);
    return sum + price * quantity;
  }, 0);

  const discount = subtotal * (safeNumber(discount_percent) / 100);
  const itemRevenue = subtotal - discount;
  const guests = safeNumber(guest_count);

  const fixedPass = normalizeCostArray(fixed_costs).reduce((sum, cost) => {
    if (!shouldPassToClient(cost)) return sum;
    return sum + priceFromMargin(safeNumber(cost.amount), cost.pass_margin);
  }, 0);

  const variablePass = normalizeCostArray(variable_costs).reduce((sum, cost) => {
    if (!shouldPassToClient(cost)) return sum;
    const amount = safeNumber(cost.amount);
    const effectiveAmount = cost.calc_type === 'per_person' ? amount * guests : amount;
    return sum + priceFromMargin(effectiveAmount, cost.pass_margin);
  }, 0);

  return Math.round((itemRevenue + fixedPass + variablePass) * 100) / 100;
}

function quotationTotalFromData(data) {
  return computeQuotationTotal({
    items: data.items || [],
    fixed_costs: data.fixed_costs || [],
    variable_costs: data.variable_costs || [],
    discount_percent: data.discount_percent,
    guest_count: data.guest_count,
  });
}

function itemPayload(item) {
  const quantity = safeNumber(item.quantity, 1);
  const unitPrice = safeNumber(item.price ?? item.unit_price);

  return {
    itemName: item.name || item.item_name || 'Item',
    quantity,
    unitPrice,
    subtotal: unitPrice * quantity,
    sheetId: item.sheet_id || null,
    sheetCost: safeNumber(item.sheet_cost),
  };
}

async function insertQuotationItems(client, quotationId, tenantId, items = []) {
  if (!Array.isArray(items) || items.length === 0) return;

  const itemQuery = `
    INSERT INTO quotation_items
      (tenant_id, quotation_id, item_name, quantity, unit_price, subtotal, sheet_id, sheet_cost)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  for (const item of items) {
    const payload = itemPayload(item);
    await client.query(itemQuery, [
      tenantId,
      quotationId,
      payload.itemName,
      payload.quantity,
      payload.unitPrice,
      payload.subtotal,
      payload.sheetId,
      payload.sheetCost,
    ]);
  }
}

async function createQuotation({
  client_id, lead_id, event_type, guest_count, event_date,
  items = [], notes = '', buffet_menu = '', tenant_id, discount_percent = 0,
  fixed_costs = [], variable_costs = [], default_margin = 40,
  total_amount,
}) {
  const normalizedFixedCosts = normalizeCostArray(fixed_costs);
  const normalizedVariableCosts = normalizeCostArray(variable_costs);
  // Honor explicit total_amount from frontend (already margin-corrected).
  // Fall back to formula-based computation when not provided.
  const total = (total_amount !== undefined && safeNumber(total_amount) > 0)
    ? safeNumber(total_amount)
    : quotationTotalFromData({
        items,
        fixed_costs: normalizedFixedCosts,
        variable_costs: normalizedVariableCosts,
        discount_percent,
        guest_count,
      });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO quotations
        (tenant_id, client_id, lead_id, event_type, guest_count, event_date,
         total_amount, status, notes, buffet_menu, discount_percent, fixed_costs, variable_costs,
         default_margin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      tenant_id,
      client_id || null,
      lead_id || null,
      event_type,
      safeNumber(guest_count),
      event_date || null,
      total,
      'draft',
      notes,
      buffet_menu || '',
      safeNumber(discount_percent),
      safeJSON(normalizedFixedCosts),
      safeJSON(normalizedVariableCosts),
      safeNumber(default_margin, 40),
    ]);

    const quotationId = result.rows[0].id;
    await insertQuotationItems(client, quotationId, tenant_id, items);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quotation:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getAllQuotations(tenant_id) {
  const result = await pool.query(
    'SELECT * FROM quotations WHERE tenant_id = $1 ORDER BY created_at DESC',
    [tenant_id]
  );
  return result.rows;
}

async function getQuotationsByClient(client_id, tenant_id) {
  const result = await pool.query(
    `
      SELECT q.*, COUNT(qi.id) as item_count
      FROM quotations q
      LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
      WHERE q.client_id = $1
        AND q.tenant_id = $2
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `,
    [client_id, tenant_id]
  );
  return result.rows;
}

async function getQuotationDetail(quotationId, tenant_id) {
  const quotationQuery = 'SELECT * FROM quotations WHERE id = $1 AND tenant_id = $2';
  const itemsQuery = 'SELECT * FROM quotation_items WHERE quotation_id = $1 AND tenant_id = $2 ORDER BY id';

  const [quotationResult, itemsResult] = await Promise.all([
    pool.query(quotationQuery, [quotationId, tenant_id]),
    pool.query(itemsQuery, [quotationId, tenant_id]),
  ]);

  if (!quotationResult.rows[0]) {
    return null;
  }

  return {
    ...quotationResult.rows[0],
    fixed_costs: normalizeCostArray(quotationResult.rows[0].fixed_costs),
    variable_costs: normalizeCostArray(quotationResult.rows[0].variable_costs),
    items: itemsResult.rows,
  };
}

async function updateQuotation(quotationId, data, tenant_id) {
  const updateData = { ...data };

  if (Array.isArray(updateData.items)) {
    updateData.fixed_costs = normalizeCostArray(updateData.fixed_costs);
    updateData.variable_costs = normalizeCostArray(updateData.variable_costs);
    // Honor explicit total_amount from frontend (already margin-corrected).
    if (updateData.total_amount === undefined || updateData.total_amount === null) {
      updateData.total_amount = quotationTotalFromData(updateData);
    }
  }

  const fields = [];
  const values = [];
  let paramCount = 1;

  const updatableFields = [
    'client_id',
    'lead_id',
    'event_type',
    'guest_count',
    'event_date',
    'total_amount',
    'status',
    'notes',
    'buffet_menu',
    'validity_days',
    'discount_percent',
    'fixed_costs',
    'variable_costs',
    'default_margin',
  ];
  const nullableFields = new Set(['client_id', 'lead_id', 'event_date']);
  const jsonFields = new Set(['fixed_costs', 'variable_costs']);

  for (const field of updatableFields) {
    if (!Object.prototype.hasOwnProperty.call(updateData, field)) continue;

    const raw = updateData[field];
    let value = nullableFields.has(field) && (raw === '' || raw === undefined) ? null : raw;

    if (jsonFields.has(field)) value = safeJSON(raw);
    if (field === 'guest_count' || field === 'discount_percent' || field === 'total_amount') value = safeNumber(raw);
    if (field === 'default_margin') value = safeNumber(raw, 40);

    fields.push(jsonFields.has(field) ? `${field} = $${paramCount}::jsonb` : `${field} = $${paramCount}`);
    values.push(value);
    paramCount++;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (fields.length > 0) {
      values.push(quotationId, tenant_id);
      const query = `
        UPDATE quotations
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (Array.isArray(updateData.items)) {
      await client.query(
        'DELETE FROM quotation_items WHERE quotation_id = $1 AND tenant_id = $2',
        [quotationId, tenant_id]
      );
      await insertQuotationItems(client, quotationId, tenant_id, updateData.items);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating quotation:', error);
    throw error;
  } finally {
    client.release();
  }

  return getQuotationDetail(quotationId, tenant_id);
}

async function deleteQuotation(quotationId, tenant_id) {
  const result = await pool.query(
    'DELETE FROM quotations WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [quotationId, tenant_id]
  );

  return result.rowCount > 0;
}

async function duplicateQuotation(quotationId, tenant_id, clientId, leadId) {
  const original = await getQuotationDetail(quotationId, tenant_id);
  if (!original) {
    return null;
  }

  const newQuotation = await createQuotation({
    tenant_id,
    client_id: clientId !== undefined ? clientId : original.client_id,
    lead_id: leadId !== undefined ? leadId : original.lead_id,
    event_type: original.event_type,
    guest_count: original.guest_count,
    event_date: original.event_date,
    notes: original.notes,
    buffet_menu: original.buffet_menu || '',
    discount_percent: safeNumber(original.discount_percent),
    fixed_costs: normalizeCostArray(original.fixed_costs),
    variable_costs: normalizeCostArray(original.variable_costs),
    default_margin: safeNumber(original.default_margin, 40),
    items: original.items.map((item) => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sheet_id: item.sheet_id || null,
      sheet_cost: safeNumber(item.sheet_cost),
    })),
  });

  return newQuotation;
}

async function setQuotationStatus(quotationId, status, tenant_id) {
  // Do not recompute total_amount — preserve the margin-corrected total saved by the user.
  const result = await pool.query(
    `UPDATE quotations
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
       AND tenant_id = $3
     RETURNING *`,
    [status, quotationId, tenant_id]
  );

  return result.rows[0] || null;
}

async function approveQuotation(quotationId, tenant_id) {
  return setQuotationStatus(quotationId, 'approved', tenant_id);
}

async function cancelQuotation(quotationId, tenant_id) {
  return setQuotationStatus(quotationId, 'cancelled', tenant_id);
}

module.exports = {
  createQuotation,
  getAllQuotations,
  getQuotationsByClient,
  getQuotationDetail,
  updateQuotation,
  deleteQuotation,
  duplicateQuotation,
  approveQuotation,
  cancelQuotation,
};
