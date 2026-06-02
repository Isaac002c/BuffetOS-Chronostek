const pool = require('../config/db');

async function createEvent({ lead_id, client_name, event_type, event_date, guest_count, location, quotation_id, notes = '', status = 'confirmed', tenant_id }) {
  const safeLeadId      = lead_id      || null;
  const safeQuotationId = quotation_id || null;
  const result = await pool.query(
    `INSERT INTO events
      (tenant_id, lead_id, client_name, event_type, event_date, guest_count, location, quotation_id, status, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
    [tenant_id, safeLeadId, client_name, event_type, event_date, guest_count, location, safeQuotationId, status, notes]
  );

  return result.rows[0];
}

async function getEventsByPeriod(tenant_id, startDate, endDate) {
  const result = await pool.query(
    `SELECT e.*,
      EXTRACT(DAY FROM e.event_date - NOW()) as days_until_event
     FROM events e
     WHERE e.tenant_id = $1
       AND e.event_date BETWEEN $2 AND $3
     ORDER BY e.event_date ASC`,
    [tenant_id, startDate, endDate]
  );
  return result.rows;
}

async function getAllUpcomingEvents(tenant_id) {
  const result = await pool.query(
    `SELECT e.*,
      EXTRACT(DAY FROM e.event_date - NOW()) as days_until_event
     FROM events e
     WHERE e.tenant_id = $1
       AND e.event_date >= NOW()
       AND e.status = 'confirmed'
     ORDER BY e.event_date ASC`,
    [tenant_id]
  );
  return result.rows;
}

async function getEventDetail(eventId, tenant_id) {
  const result = await pool.query(
    `SELECT e.*,
      EXTRACT(DAY FROM e.event_date - NOW()) as days_until_event,
      q.total_amount,
      q.status as quotation_status
     FROM events e
     LEFT JOIN quotations q ON e.quotation_id = q.id AND q.tenant_id = $1
     WHERE e.id = $2 AND e.tenant_id = $1`,
    [tenant_id, eventId]
  );
  return result.rows[0];
}

async function updateEvent(eventId, data, tenant_id) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  // Sanitize UUID fields — empty string crashes PostgreSQL UUID cast
  if (data.lead_id      === '') data.lead_id      = null;
  if (data.quotation_id === '') data.quotation_id = null;

  const allowedFields = ['lead_id', 'client_name', 'event_type', 'event_date', 'guest_count', 'location', 'quotation_id', 'status', 'notes'];
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      fields.push(`${field} = $${paramCount}`);
      values.push(data[field]);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    return getEventDetail(eventId, tenant_id);
  }

  values.push(eventId, tenant_id);
  const query = `
    UPDATE events
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function deleteEvent(eventId, tenant_id) {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [eventId, tenant_id]
  );
  return result.rowCount > 0;
}

async function checkDateConflicts(tenant_id, eventDate, duration = 1, excludeEventId = null) {
  const endDate = new Date(eventDate);
  endDate.setDate(endDate.getDate() + duration);

  const values = [tenant_id, eventDate, endDate];
  let query = `
    SELECT COUNT(*) as conflict_count
    FROM events
    WHERE tenant_id = $1
      AND event_date BETWEEN $2 AND $3
      AND status = 'confirmed'`;

  if (excludeEventId) {
    query += ' AND id != $4';
    values.push(excludeEventId);
  }

  const result = await pool.query(query, values);
  return Number(result.rows[0].conflict_count) > 0;
}

async function getEventStats(tenant_id) {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_events,
      SUM(guest_count) as total_guests,
      COUNT(DISTINCT event_type) as event_types,
      MAX(event_date) as next_event_date
     FROM events
     WHERE tenant_id = $1
       AND status = 'confirmed'
       AND event_date >= NOW()`,
    [tenant_id]
  );
  return result.rows[0];
}

module.exports = {
  createEvent,
  getEventsByPeriod,
  getAllUpcomingEvents,
  getEventDetail,
  updateEvent,
  deleteEvent,
  checkDateConflicts,
  getEventStats,
};
