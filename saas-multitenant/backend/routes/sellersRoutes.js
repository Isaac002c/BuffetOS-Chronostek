const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const sellerModel = require('../models/sellerModels');
const { checkPermission } = require('../middlewares/checkPermission');

// GET /api/sellers - Listar todos os vendedores do tenant
router.get('/', checkPermission('clients:read'), async (req, res) => {
  try {
    const sellers = await sellerModel.getAll(req.tenantId);
    res.json({ success: true, data: sellers || [] });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao buscar vendedores:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/sellers/metrics - Buscar vendedores com métricas de desempenho
router.get('/metrics', checkPermission('clients:read'), async (req, res) => {
  try {
    const sellers = await sellerModel.getSellersWithMetrics(req.tenantId);
    res.json({ success: true, data: sellers || [] });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao buscar métricas de vendedores:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// GET /api/sellers/:id - Buscar vendedor por ID
router.get('/:id', checkPermission('clients:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, error: 'ID de vendedor inválido' });
    }

    const seller = await sellerModel.getById(id, req.tenantId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Vendedor não encontrado' });
    }

    res.json({ success: true, data: seller });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao buscar vendedor:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// POST /api/sellers - Criar vendedor
router.post('/', checkPermission('clients:create'), async (req, res) => {
  try {
    const { name, email, avatar, monthly_target } = req.body;
    const tenantId = req.tenantId;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }

    const seller = await sellerModel.create({
      tenant_id: tenantId,
      name,
      email,
      avatar,
      monthly_target: monthly_target || 50000,
    });

    res.status(201).json({ success: true, data: seller });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao criar vendedor:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// PUT /api/sellers/:id - Atualizar vendedor
router.put('/:id', checkPermission('clients:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar, monthly_target, active } = req.body;

    const seller = await sellerModel.update(id, { name, email, avatar, monthly_target, active }, req.tenantId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Vendedor não encontrado' });
    }

    res.json({ success: true, data: seller });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao atualizar vendedor:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// DELETE /api/sellers/:id - Deletar vendedor
router.delete('/:id', checkPermission('clients:delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, error: 'ID de vendedor inválido' });
    }

    const seller = await sellerModel.delete(id, req.tenantId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Vendedor não encontrado' });
    }

    res.json({ success: true, data: seller, message: 'Vendedor deletado com sucesso' });
  } catch (err) {
    console.error('[sellersRoutes] Erro ao deletar vendedor:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
