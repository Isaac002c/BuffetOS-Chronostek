const pool = require('../config/db');

const toDateOrNull = (v) => (v === '' || v == null) ? null : v;

const createContract = async ({ 
  tenant_id, client_id, service_id, organ,
  infraction_type, vehicle_plate, vehicle_model, status, value, 
  due_date, notes, numero_multa, deadline_date 
}) => {
  if (!tenant_id) throw new Error('tenant_id e obrigatorio');
  if (!client_id) throw new Error('client_id e obrigatorio');
  const result = await pool.query(
    `INSERT INTO fines(
      tenant_id, client_id, service_type_id, organ,
      infraction_type, plate, vehicle_model, stage, value, 
      due_date, notes, fine_number, defense_date
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      tenant_id, client_id, service_id, organ,
      infraction_type, vehicle_plate, vehicle_model,
      status || 'APRS DEFESA PREVIA', value || 0,
      toDateOrNull(due_date), notes, numero_multa, toDateOrNull(deadline_date)
    ]
  );
  return result.rows[0];
};

const getContractsByService = async (service_type_id, tenant_id, client_id) => {
  const result = await pool.query(
    `SELECT 
      f.id,
      f.tenant_id,
      f.client_id,
      f.service_type_id AS service_id,
      f.fine_number AS numero_multa,
      f.plate AS vehicle_plate,
      f.organ,
      f.infraction_type,
      f.vehicle_model,
      f.infraction_date,
      f.stage AS status,
      f.value,
      f.cost,
      f.paid_value,
      f.due_date,
      f.defense_date AS deadline_date,
      f.notes,
      f.created_at,
      f.updated_at,
      st.code AS service_name
     FROM fines f
     LEFT JOIN service_types st ON f.service_type_id = st.id
     WHERE f.service_type_id = $1 AND f.tenant_id = $2 AND f.client_id = $3
     ORDER BY f.created_at DESC`,
    [service_type_id, tenant_id, client_id]
  );
  return result.rows;
};

const getContractsByClient = async (client_id, tenant_id) => {
  const result = await pool.query(
    `SELECT 
      f.id,
      f.fine_number AS numero_multa,
      f.plate AS vehicle_plate,
      f.organ,
      f.stage AS status,
      f.value,
      f.created_at,
      f.updated_at,
      st.code AS service_name
     FROM fines f
     LEFT JOIN service_types st ON f.service_type_id = st.id
     WHERE f.client_id = $1 AND f.tenant_id = $2
     ORDER BY f.created_at DESC`,
    [client_id, tenant_id]
  );
  return result.rows;
};

const getAllContracts = async (tenant_id) => {
  const result = await pool.query(
    `SELECT 
      f.*,
      f.fine_number AS numero_multa,
      f.plate AS vehicle_plate,
      f.stage AS status,
      cl.name AS client_name,
      cl.cpf AS client_cpf,
      cl.phone AS client_phone,
      st.code AS service_name
     FROM fines f
     LEFT JOIN clients cl ON f.client_id = cl.id
     LEFT JOIN service_types st ON f.service_type_id = st.id
     WHERE f.tenant_id = $1
     ORDER BY f.created_at DESC`,
    [tenant_id]
  );
  return result.rows;
};

const getContractsByFilter = async (tenant_id, filters = {}) => {
  let query = `
    SELECT f.*, f.fine_number AS numero_multa, f.plate AS vehicle_plate, f.stage AS status,
      cl.name AS client_name, cl.cpf AS client_cpf, st.code AS service_name
    FROM fines f
    LEFT JOIN clients cl ON f.client_id = cl.id
    LEFT JOIN service_types st ON f.service_type_id = st.id
    WHERE f.tenant_id = $1
  `;
  const params = [tenant_id];
  let i = 2;
  if (filters.client_id)     { query += ` AND f.client_id = $${i}`;       params.push(filters.client_id); i++; }
  if (filters.status)        { query += ` AND f.stage = $${i}`;            params.push(filters.status); i++; }
  if (filters.organ)         { query += ` AND f.organ ILIKE $${i}`;        params.push(`%${filters.organ}%`); i++; }
  if (filters.vehicle_plate) { query += ` AND f.plate ILIKE $${i}`;        params.push(`%${filters.vehicle_plate}%`); i++; }
  query += ' ORDER BY f.created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getContractById = async (id, tenant_id) => {
  const result = await pool.query(
    `SELECT f.*, f.fine_number AS numero_multa, f.plate AS vehicle_plate, f.stage AS status,
      cl.name AS client_name, cl.cpf AS client_cpf, cl.phone AS client_phone, cl.email AS client_email,
      st.code AS service_name
     FROM fines f
     LEFT JOIN clients cl ON f.client_id = cl.id
     LEFT JOIN service_types st ON f.service_type_id = st.id
     WHERE f.id = $1 AND f.tenant_id = $2`,
    [id, tenant_id]
  );
  return result.rows[0];
};

const getContractsByStatus = async (tenant_id) => {
  const result = await pool.query(
    `SELECT stage AS status, COUNT(*) as count FROM fines WHERE tenant_id = $1 GROUP BY stage`,
    [tenant_id]
  );
  return result.rows;
};

const getContractsByOrgan = async (tenant_id) => {
  const result = await pool.query(
    `SELECT organ, COUNT(*) as count FROM fines WHERE tenant_id = $1 GROUP BY organ ORDER BY count DESC`,
    [tenant_id]
  );
  return result.rows;
};

const countContracts = async (tenant_id) => {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM fines WHERE tenant_id = $1',
    [tenant_id]
  );
  return result.rows[0].total;
};

const countActiveContracts = async (tenant_id) => {
  const result = await pool.query(
    `SELECT COUNT(*) as total FROM fines 
     WHERE tenant_id = $1 AND stage NOT IN ('DEFERIDO','INDEFERIDO','CANCELADO')`,
    [tenant_id]
  );
  return result.rows[0].total;
};

const getDashboardStats = async (tenant_id) => {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as total_contracts,
      COUNT(CASE WHEN stage NOT IN ('DEFERIDO','INDEFERIDO','CANCELADO') THEN 1 END) as active_contracts,
      COUNT(CASE WHEN stage = 'DEFERIDO' THEN 1 END) as completed_contracts,
      COUNT(CASE WHEN stage = 'CANCELADO' THEN 1 END) as inactive_contracts
    FROM fines WHERE tenant_id = $1`,
    [tenant_id]
  );
  return result.rows[0];
};

const getContractsGroupedByOrgan = async (tenant_id) => {
  const result = await pool.query(
    `SELECT 
      f.organ,
      COUNT(*) as count,
      COUNT(CASE WHEN f.stage NOT IN ('DEFERIDO','INDEFERIDO','CANCELADO') THEN 1 END) as active_count
     FROM fines f
     LEFT JOIN service_types st ON f.service_type_id = st.id
     WHERE f.tenant_id = $1
       AND UPPER(st.code) = 'PROCESSOS'
       AND f.organ IS NOT NULL AND f.organ != ''
     GROUP BY f.organ
     ORDER BY count DESC`,
    [tenant_id]
  );
  return result.rows;
};

const getAPRsByStage = async (tenant_id) => {
  const result = await pool.query(
    `SELECT f.stage AS status, COUNT(*) as count
     FROM fines f
     WHERE f.tenant_id = $1
       AND UPPER(f.stage) IN (
         'APRS DEFESA PREVIA','DEFESA PREVIA - ANALISE',
         'APRS 1 INSTANCIA','1 INSTANCIA - ANALISE',
         'APRS 2 INSTANCIA','2 INSTANCIA - ANALISE'
       )
     GROUP BY f.stage ORDER BY f.stage`,
    [tenant_id]
  );
  return result.rows;
};

const getContractsNearDueDate = async (tenant_id, days = 30) => {
  const result = await pool.query(
    `SELECT f.*, f.fine_number AS numero_multa, f.plate AS vehicle_plate, f.stage AS status,
      cl.name AS client_name, cl.phone AS client_phone
     FROM fines f LEFT JOIN clients cl ON f.client_id = cl.id
     WHERE f.tenant_id = $1
       AND f.due_date IS NOT NULL
       AND f.due_date <= NOW() + INTERVAL '1 day' * $2
       AND f.due_date >= NOW()
     ORDER BY f.due_date ASC`,
    [tenant_id, days]
  );
  return result.rows;
};

const getOverdueContracts = async (tenant_id) => {
  const result = await pool.query(
    `SELECT f.*, f.fine_number AS numero_multa, f.plate AS vehicle_plate, f.stage AS status,
      cl.name AS client_name, cl.phone AS client_phone
     FROM fines f LEFT JOIN clients cl ON f.client_id = cl.id
     WHERE f.tenant_id = $1
       AND f.due_date IS NOT NULL AND f.due_date < NOW()
     ORDER BY f.due_date ASC`,
    [tenant_id]
  );
  return result.rows;
};

const getAlerts = async (tenant_id) => {
  const alerts = [];
  const nearDue = await pool.query(
    `SELECT COUNT(*) as count FROM fines WHERE tenant_id=$1
     AND due_date IS NOT NULL AND due_date <= NOW() + INTERVAL '7 days' AND due_date >= NOW()`,
    [tenant_id]
  );
  if (parseInt(nearDue.rows[0].count) > 0)
    alerts.push({ type: 'warning', title: 'Multas proximas ao vencimento', message: `${nearDue.rows[0].count} multa(s) vencem nos proximos 7 dias`, count: parseInt(nearDue.rows[0].count) });

  const overdue = await pool.query(
    `SELECT COUNT(*) as count FROM fines WHERE tenant_id=$1 AND due_date IS NOT NULL AND due_date < NOW()`,
    [tenant_id]
  );
  if (parseInt(overdue.rows[0].count) > 0)
    alerts.push({ type: 'danger', title: 'Multas vencidas', message: `${overdue.rows[0].count} multa(s) estao vencidas`, count: parseInt(overdue.rows[0].count) });

  return alerts;
};

const updateContract = async (id, { 
  organ, infraction_type, vehicle_plate, vehicle_model,
  status, value, due_date, notes, numero_multa, deadline_date
}, tenant_id) => {
  const result = await pool.query(
    `UPDATE fines 
     SET organ=$1, infraction_type=$2, plate=$3, vehicle_model=$4,
         stage=$5, value=$6, due_date=$7, notes=$8,
         fine_number=$9, defense_date=$10, updated_at=NOW()
     WHERE id=$11 AND tenant_id=$12 RETURNING *`,
    [organ, infraction_type, vehicle_plate, vehicle_model,
     status, value, toDateOrNull(due_date), notes,
     numero_multa, toDateOrNull(deadline_date), id, tenant_id]
  );
  return result.rows[0];
};

const updateContractStatus = async (id, status, tenant_id) => {
  const result = await pool.query(
    `UPDATE fines SET stage=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
    [status, id, tenant_id]
  );
  return result.rows[0];
};

const deleteContract = async (id, tenant_id) => {
  const result = await pool.query(
    'DELETE FROM fines WHERE id=$1 AND tenant_id=$2 RETURNING *',
    [id, tenant_id]
  );
  return result.rows[0];
};

module.exports = {
  createContract, getAllContracts, getContractsByFilter, getContractById,
  getContractsByClient, getContractsByService, getContractsByStatus,
  getContractsByOrgan, countContracts, countActiveContracts, getDashboardStats,
  getContractsGroupedByOrgan, getAPRsByStage, getContractsNearDueDate,
  getOverdueContracts, getAlerts, updateContract, updateContractStatus, deleteContract
};