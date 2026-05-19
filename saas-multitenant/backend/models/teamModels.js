const pool = require('../config/db');

// ========== TEAM MODEL ==========

const teamModel = {
  // Buscar todos os membros da equipe de um tenant
  async getAll(tenantId) {
    try {
      const result = await pool.query(
        `SELECT id, tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active, created_at, updated_at
         FROM team_members 
         WHERE tenant_id = $1 
         ORDER BY nome ASC`,
        [tenantId]
      );
      return result.rows;
    } catch (err) {
      console.error('[teamModel] getAll error:', err);
      throw err;
    }
  },

  // Buscar membro da equipe por ID
  async getById(id, tenantId) {
    try {
      const result = await pool.query(
        `SELECT id, tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active, created_at, updated_at
         FROM team_members 
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[teamModel] getById error:', err);
      throw err;
    }
  },

  // Criar membro da equipe
  async create({ tenant_id, nome, cpf, rg, email, chave_pix, funcao = 'Garcom' }) {
    try {
      if (!tenant_id) {
        throw new Error('tenant_id é obrigatório para criar um membro da equipe');
      }
      
      const result = await pool.query(
        `INSERT INTO team_members (tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id, tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active, created_at, updated_at`,
        [tenant_id, nome, cpf, rg, email, chave_pix, funcao]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[teamModel] create error:', err);
      throw err;
    }
  },

  // Atualizar membro da equipe
  async update(id, { nome, cpf, rg, email, chave_pix, funcao, is_active }, tenantId) {
    try {
      const result = await pool.query(
        `UPDATE team_members 
         SET nome = COALESCE($1, nome),
             cpf = COALESCE($2, cpf),
             rg = COALESCE($3, rg),
             email = COALESCE($4, email),
             chave_pix = COALESCE($5, chave_pix),
             funcao = COALESCE($6, funcao),
             is_active = COALESCE($7, is_active),
             updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9
         RETURNING id, tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active, created_at, updated_at`,
        [nome, cpf, rg, email, chave_pix, funcao, is_active, id, tenantId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[teamModel] update error:', err);
      throw err;
    }
  },

  // Deletar membro da equipe
  async delete(id, tenantId) {
    try {
      const result = await pool.query(
        `DELETE FROM team_members 
         WHERE id = $1 AND tenant_id = $2
         RETURNING id`,
        [id, tenantId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[teamModel] delete error:', err);
      throw err;
    }
  },
};

module.exports = teamModel;
