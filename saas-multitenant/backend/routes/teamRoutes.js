const express = require('express');
const router = express.Router();
const teamModel = require('../models/teamModels');

// ========== TEAM ROUTES ==========

// GET /api/team - Buscar todos os membros da equipe
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado' });
    }
    
    const team = await teamModel.getAll(tenantId);
    res.json(team || []);
  } catch (err) {
    console.error('[teamRoutes] Erro ao buscar membros da equipe:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/team/:id - Buscar membro da equipe por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado' });
    }
    
    // Verificar se o ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, error: 'ID de membro inválido' });
    }
    
    const member = await teamModel.getById(id, tenantId);
    
    if (!member) {
      return res.status(404).json({ success: false, error: 'Membro não encontrado' });
    }
    
    res.json(member);
  } catch (err) {
    console.error('[teamRoutes] Erro ao buscar membro:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/team - Criar membro da equipe
router.post('/', async (req, res) => {
  try {
    const { nome, cpf, rg, email, chave_pix, funcao } = req.body;
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado. Faça login novamente.' });
    }
    
    if (!nome) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    
    if (!cpf) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email é obrigatório' });
    }
    
    const member = await teamModel.create({
      tenant_id: tenantId,
      nome,
      cpf,
      rg,
      email,
      chave_pix,
      funcao: funcao || 'Garcom',
    });
    
    res.status(201).json(member);
  } catch (err) {
    console.error('[teamRoutes] Erro ao criar membro:', err);
    
    if (err.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ success: false, error: 'CPF já cadastrado para este tenant' });
    }
    
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/team/:id - Atualizar membro da equipe
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cpf, rg, email, chave_pix, funcao, is_active } = req.body;
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado' });
    }
    
    // Verificar se o ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, error: 'ID de membro inválido' });
    }
    
    const member = await teamModel.update(
      id,
      { nome, cpf, rg, email, chave_pix, funcao, is_active },
      tenantId
    );
    
    if (!member) {
      return res.status(404).json({ success: false, error: 'Membro não encontrado' });
    }
    
    res.json(member);
  } catch (err) {
    console.error('[teamRoutes] Erro ao atualizar membro:', err);
    
    if (err.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ success: false, error: 'CPF já cadastrado para este tenant' });
    }
    
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/team/:id - Deletar membro da equipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado' });
    }
    
    // Verificar se o ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, error: 'ID de membro inválido' });
    }
    
    const result = await teamModel.delete(id, tenantId);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Membro não encontrado' });
    }
    
    res.json({ success: true, message: 'Membro deletado com sucesso' });
  } catch (err) {
    console.error('[teamRoutes] Erro ao deletar membro:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
