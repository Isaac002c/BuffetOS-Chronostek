const pool = require('../config/db');

// ============================================
// CLIENTS MODEL - Clientes/Proprietários
// ============================================

// Helper - converte string vazia para null (evita erro de tipo date no PostgreSQL)
const toDateOrNull = (value) => (value === '' || value === undefined ? null : value);
const toStrOrNull = (value) => (value === '' || value === undefined ? null : value);

// CREATE - Criar novo cliente
const createClient = async ({ 
  tenant_id, name, birth_date, cpf, cnh, first_cnh, phone, email, address, notes 
}) => {
  if (!tenant_id) {
    throw new Error('tenant_id é obrigatório para criar um cliente');
  }
  
  const result = await pool.query(
    `INSERT INTO clients(tenant_id, name, birth_date, cpf, cnh, first_cnh, phone, email, address, notes) 
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      tenant_id,
      name,
      toDateOrNull(birth_date),
      toStrOrNull(cpf),
      toStrOrNull(cnh),
      toDateOrNull(first_cnh),
      toStrOrNull(phone),
      toStrOrNull(email),
      toStrOrNull(address),
      toStrOrNull(notes)
    ]
  );
  
  return result.rows[0];
};

// READ - Listar todos os clientes do tenant
const getAllClients = async (tenant_id) => {
  const result = await pool.query(
    `SELECT * FROM clients WHERE tenant_id = $1 ORDER BY name ASC`,
    [tenant_id]
  );
  return result.rows;
};

// READ - Buscar cliente por ID
const getClientById = async (id, tenant_id) => {
  const result = await pool.query(
    'SELECT * FROM clients WHERE id = $1 AND tenant_id = $2',
    [id, tenant_id]
  );
  return result.rows[0];
};

// READ - Buscar cliente por CPF
const getClientByCPF = async (cpf, tenant_id) => {
  const result = await pool.query(
    'SELECT * FROM clients WHERE cpf = $1 AND tenant_id = $2',
    [cpf, tenant_id]
  );
  return result.rows[0];
};

// READ - Pesquisar clientes
const searchClients = async (tenant_id, searchTerm) => {
  const result = await pool.query(
    `SELECT * FROM clients 
     WHERE tenant_id = $1 
       AND (name ILIKE $2 OR cpf ILIKE $2 OR cnh ILIKE $2 OR phone ILIKE $2)
     ORDER BY name ASC
     LIMIT 50`,
    [tenant_id, `%${searchTerm}%`]
  );
  return result.rows;
};

// READ - Contar clientes
const countClients = async (tenant_id) => {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM clients WHERE tenant_id = $1',
    [tenant_id]
  );
  return result.rows[0].total;
};

// UPDATE - Atualizar cliente
const updateClient = async (id, { name, birth_date, cpf, cnh, first_cnh, phone, email, address, notes }, tenant_id) => {
  const result = await pool.query(
    `UPDATE clients 
     SET name = $1, birth_date = $2, cpf = $3, cnh = $4, first_cnh = $5, phone = $6, email = $7, address = $8, notes = $9, updated_at = NOW()
     WHERE id = $10 AND tenant_id = $11 RETURNING *`,
    [
      name,
      toDateOrNull(birth_date),
      toStrOrNull(cpf),
      toStrOrNull(cnh),
      toDateOrNull(first_cnh),
      toStrOrNull(phone),
      toStrOrNull(email),
      toStrOrNull(address),
      toStrOrNull(notes),
      id,
      tenant_id
    ]
  );
  return result.rows[0];
};

// DELETE - Deletar cliente
const deleteClient = async (id, tenant_id) => {
  const result = await pool.query(
    'DELETE FROM clients WHERE id = $1 AND tenant_id = $2 RETURNING *',
    [id, tenant_id]
  );
  return result.rows[0];
};

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  getClientByCPF,
  searchClients,
  countClients,
  updateClient,
  deleteClient
};