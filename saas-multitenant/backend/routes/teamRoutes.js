const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const teamModel = require('../models/teamModels');
const { checkPermission } = require('../middlewares/checkPermission');

// ========== TEAM ROUTES ==========

// GET /api/team - Buscar todos os membros da equipe
router.get('/', checkPermission('team:read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado' });
    }
    
    const team = await teamModel.getAll(tenantId);
    res.json({ success: true, data: team || [] });
  } catch (err) {
    console.error('[teamRoutes] Erro ao buscar membros da equipe:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/team/:id - Buscar membro da equipe por ID
router.get('/:id', checkPermission('team:read'), async (req, res) => {
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
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// Valores permitidos para campos de equipe
const FUNCOES_PERMITIDAS = ['Garcom', 'Cozinheiro', 'Assistente', 'Coordenador', 'Barman', 'Auxiliar', 'Outro'];
const STATUS_PERMITIDOS = ['ativo', 'inativo', 'ferias', 'afastado'];

// POST /api/team - Criar membro da equipe
router.post('/', checkPermission('team:create'), async (req, res) => {
  try {
    const { nome, cpf, rg, email, chave_pix, funcao, custo_diaria, disponibilidade, status, observacoes } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant não identificado. Faça login novamente.' });
    }

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório (mínimo 2 caracteres)' });
    }

    if (!cpf) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }

    // CPF: aceitar apenas dígitos e separadores, max 14 chars
    if (typeof cpf !== 'string' || cpf.replace(/\D/g, '').length !== 11) {
      return res.status(400).json({ success: false, error: 'CPF inválido' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    if (funcao && !FUNCOES_PERMITIDAS.includes(funcao)) {
      return res.status(400).json({ success: false, error: `Função inválida. Permitidas: ${FUNCOES_PERMITIDAS.join(', ')}` });
    }

    if (status && !STATUS_PERMITIDOS.includes(status)) {
      return res.status(400).json({ success: false, error: `Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(', ')}` });
    }

    if (custo_diaria !== undefined && custo_diaria !== null && custo_diaria !== '') {
      const v = Number(custo_diaria);
      if (isNaN(v) || v < 0) {
        return res.status(400).json({ success: false, error: 'custo_diaria deve ser um número positivo' });
      }
    }

    const member = await teamModel.create({
      tenant_id: tenantId,
      nome,
      cpf,
      rg,
      email: email || null,
      chave_pix,
      funcao: funcao || 'Garcom',
      custo_diaria: custo_diaria || null,
      disponibilidade: disponibilidade || null,
      status: status || 'ativo',
      observacoes: observacoes || null,
    });
    
    res.status(201).json(member);
  } catch (err) {
    console.error('[teamRoutes] Erro ao criar membro:', err);
    
    if (err.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ success: false, error: 'CPF já cadastrado para este tenant' });
    }
    
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// PUT /api/team/:id - Atualizar membro da equipe
router.put('/:id', checkPermission('team:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cpf, rg, email, chave_pix, funcao, is_active,
            custo_diaria, disponibilidade, status, observacoes } = req.body;
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
      { nome, cpf, rg, email, chave_pix, funcao, is_active,
        custo_diaria, disponibilidade, status, observacoes },
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
    
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// DELETE /api/team/:id - Deletar membro da equipe
router.delete('/:id', checkPermission('team:delete'), async (req, res) => {
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
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
