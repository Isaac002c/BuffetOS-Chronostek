const pool = require('../config/db');

function computeQuotationTotal(items = []) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price || item.unit_price || 0);
    return sum + price * quantity;
  }, 0);
}

async function createQuotation({
  client_id, lead_id, event_type, guest_count, event_date,
  items = [], notes = '', buffet_menu = '', tenant_id, discount_percent = 0,
  fixed_costs = [], variable_costs = [], default_margin = 40,
}) {
  const subtotal = computeQuotationTotal(items);
  const total = subtotal * (1 - (Number(discount_percent) || 0) / 100);

  const safeJSON = (v) => (Array.isArray(v) ? JSON.stringify(v) : '[]');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO quotations
        (tenant_id, client_id, lead_id, event_type, guest_count, event_date,
         total_amount, status, notes, buffet_menu, discount_percent, fixed_costs, variable_costs,
         default_margin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      tenant_id,
      client_id || null,
      lead_id   || null,
      event_type,
      guest_count,
      event_date || null,
      total,
      'draft',
      notes,
      buffet_menu || '',
      Number(discount_percent) || 0,
      safeJSON(fixed_costs),
      safeJSON(variable_costs),
      Number(default_margin) ?? 40,
    ]);

    const quotationId = result.rows[0].id;

    if (items.length > 0) {
      const itemQuery = `
        INSERT INTO quotation_items
          (tenant_id, quotation_id, item_name, quantity, unit_price, subtotal, sheet_id, sheet_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const item of items) {
        const itemName  = item.name || item.item_name || 'Item';
        const quantity  = Number(item.quantity)  || 1;
        const unitPrice = Number(item.price || item.unit_price || 0);
        const sheetId   = item.sheet_id   || null;
        const sheetCost = Number(item.sheet_cost) || 0;
        await client.query(itemQuery, [
          tenant_id, quotationId,
          itemName, quantity, unitPrice, unitPrice * quantity,
          sheetId, sheetCost,
        ]);
      }
    }

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
  const itemsQuery = `SELECT * FROM quotation_items WHERE quotation_id = $1 AND tenant_id = $2 ORDER BY id`;

  const [quotationResult, itemsResult] = await Promise.all([
    pool.query(quotationQuery, [quotationId, tenant_id]),
    pool.query(itemsQuery, [quotationId, tenant_id]),
  ]);

  if (!quotationResult.rows[0]) {
    return null;
  }

  return {
    ...quotationResult.rows[0],
    items: itemsResult.rows,
  };
}

async function updateQuotation(quotationId, data, tenant_id) {
  if (Array.isArray(data.items)) {
    const subtotal = computeQuotationTotal(data.items);
    const pct = Number(data.discount_percent) || 0;
    data.total_amount = subtotal * (1 - pct / 100);
  }

  const fields = [];
  const values = [];
  let paramCount = 1;

  const updatableFields = ['client_id', 'lead_id', 'event_type', 'guest_count', 'event_date', 'total_amount', 'status', 'notes', 'buffet_menu', 'validity_days', 'discount_percent', 'fixed_costs', 'variable_costs', 'default_margin'];
  // Campos que não podem ser string vazia no PostgreSQL — converte para null
  const nullableFields  = new Set(['client_id', 'lead_id', 'event_date']);

  for (const field of updatableFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const raw   = data[field];
      const value = nullableFields.has(field) && (raw === '' || raw === undefined) ? null : raw;
      fields.push(`${field} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length > 0) {
    values.push(quotationId, tenant_id);
    const query = `
      UPDATE quotations
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
  }

  if (Array.isArray(data.items)) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM quotation_items WHERE quotation_id = $1 AND tenant_id = $2', [quotationId, tenant_id]);
      const itemQuery = `
        INSERT INTO quotation_items
          (tenant_id, quotation_id, item_name, quantity, unit_price, subtotal, sheet_id, sheet_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      for (const item of data.items) {
        const itemName  = item.name || item.item_name || 'Item';
        const quantity  = Number(item.quantity)  || 1;
        const unitPrice = Number(item.price || item.unit_price || 0);
        const sheetId   = item.sheet_id   || null;
        const sheetCost = Number(item.sheet_cost) || 0;
        await client.query(itemQuery, [
          tenant_id, quotationId,
          itemName, quantity, unitPrice, unitPrice * quantity,
          sheetId, sheetCost,
        ]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating quotation items:', error);
      throw error;
    } finally {
      client.release();
    }
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
    client_id:       clientId !== undefined ? clientId : original.client_id,
    lead_id:         leadId   !== undefined ? leadId   : original.lead_id,
    event_type:      original.event_type,
    guest_count:     original.guest_count,
    event_date:      original.event_date,
    notes:           original.notes,
    discount_percent: Number(original.discount_percent) || 0,
    fixed_costs:     Array.isArray(original.fixed_costs)    ? original.fixed_costs    : [],
    variable_costs:  Array.isArray(original.variable_costs) ? original.variable_costs : [],
    default_margin:  Number(original.default_margin) || 40,
    items: original.items.map((item) => ({
      item_name:  item.item_name,
      quantity:   item.quantity,
      unit_price: item.unit_price,
      sheet_id:   item.sheet_id   || null,
      sheet_cost: Number(item.sheet_cost) || 0,
    })),
  });

  return newQuotation;
}

async function setQuotationStatus(quotationId, status, tenant_id) {
  const quotation = await getQuotationDetail(quotationId, tenant_id);
  if (!quotation) {
    return null;
  }

  const subtotal = computeQuotationTotal(quotation.items);
  const pct = Number(quotation.discount_percent) || 0;
  const total = subtotal * (1 - pct / 100);
  const result = await pool.query(
    `UPDATE quotations
     SET status = $1,
         total_amount = $2,
         updated_at = NOW()
     WHERE id = $3
       AND tenant_id = $4
     RETURNING *`,
    [status, total, quotationId, tenant_id]
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
