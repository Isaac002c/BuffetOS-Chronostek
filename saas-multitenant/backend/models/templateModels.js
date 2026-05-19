// models/templateModels.js
// Modelo para gerenciar templates de eventos e itens

const pool = require('../config/db');

// ============================================
// EVENT TEMPLATES
// ============================================

async function createEventTemplate({ tenant_id, name, description, event_type }) {
  const query = `
    INSERT INTO event_templates (tenant_id, name, description, event_type, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *
  `;
  const result = await pool.query(query, [tenant_id, name, description, event_type]);
  return result.rows[0];
}

async function getAllEventTemplates(tenant_id) {
  const query = `
    SELECT * FROM event_templates 
    WHERE tenant_id = $1 
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [tenant_id]);
  return result.rows;
}

async function getEventTemplateById(id, tenant_id) {
  const query = `
    SELECT * FROM event_templates 
    WHERE id = $1 AND tenant_id = $2
  `;
  const result = await pool.query(query, [id, tenant_id]);
  return result.rows[0];
}

async function updateEventTemplate(id, { name, description, event_type }, tenant_id) {
  const query = `
    UPDATE event_templates 
    SET name = COALESCE($1, name), 
        description = COALESCE($2, description),
        event_type = COALESCE($3, event_type),
        updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, event_type, id, tenant_id]);
  return result.rows[0];
}

async function deleteEventTemplate(id, tenant_id) {
  const query = `
    DELETE FROM event_templates 
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;
  const result = await pool.query(query, [id, tenant_id]);
  return result.rows.length > 0;
}

// ============================================
// TEMPLATE ITEMS
// ============================================

async function createTemplateItem({ template_id, tenant_id, name, unit, quantity_per_person, cost_per_unit }) {
  const query = `
    INSERT INTO template_items (template_id, tenant_id, name, unit, quantity_per_person, cost_per_unit, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;
  const result = await pool.query(query, [template_id, tenant_id, name, unit, quantity_per_person, cost_per_unit]);
  return result.rows[0];
}

async function getTemplateItems(template_id, tenant_id) {
  const query = `
    SELECT * FROM template_items 
    WHERE template_id = $1 AND tenant_id = $2
    ORDER BY created_at ASC
  `;
  const result = await pool.query(query, [template_id, tenant_id]);
  return result.rows;
}

async function getTemplateItemById(id, tenant_id) {
  const query = `
    SELECT * FROM template_items 
    WHERE id = $1 AND tenant_id = $2
  `;
  const result = await pool.query(query, [id, tenant_id]);
  return result.rows[0];
}

async function updateTemplateItem(id, { name, unit, quantity_per_person, cost_per_unit }, tenant_id) {
  const query = `
    UPDATE template_items 
    SET name = COALESCE($1, name),
        unit = COALESCE($2, unit),
        quantity_per_person = COALESCE($3, quantity_per_person),
        cost_per_unit = COALESCE($4, cost_per_unit),
        updated_at = NOW()
    WHERE id = $5 AND tenant_id = $6
    RETURNING *
  `;
  const result = await pool.query(query, [name, unit, quantity_per_person, cost_per_unit, id, tenant_id]);
  return result.rows[0];
}

async function deleteTemplateItem(id, tenant_id) {
  const query = `
    DELETE FROM template_items 
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;
  const result = await pool.query(query, [id, tenant_id]);
  return result.rows.length > 0;
}

// ============================================
// HELPER: GET TEMPLATE WITH ITEMS
// ============================================

async function getTemplateWithItems(id, tenant_id) {
  const template = await getEventTemplateById(id, tenant_id);
  if (!template) return null;

  const items = await getTemplateItems(id, tenant_id);
  return {
    ...template,
    items,
  };
}

module.exports = {
  createEventTemplate,
  getAllEventTemplates,
  getEventTemplateById,
  updateEventTemplate,
  deleteEventTemplate,
  createTemplateItem,
  getTemplateItems,
  getTemplateItemById,
  updateTemplateItem,
  deleteTemplateItem,
  getTemplateWithItems,
};
