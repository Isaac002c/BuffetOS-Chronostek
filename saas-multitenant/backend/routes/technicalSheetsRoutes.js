const express = require('express');
const router  = express.Router();
const model   = require('../models/technicalSheetModels');
const { checkPermission } = require('../middlewares/checkPermission');
const { safeError } = require('../utils/errorResponse');

// ── Validação básica ──────────────────────────────────────────────────────────

function validateSheet(body, res) {
  const { name, base_yield, ingredients } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Nome da ficha técnica é obrigatório' });
    return false;
  }
  if (name.trim().length > 200) {
    res.status(400).json({ success: false, error: 'Nome excede 200 caracteres' });
    return false;
  }
  if (base_yield !== undefined && (isNaN(Number(base_yield)) || Number(base_yield) <= 0)) {
    res.status(400).json({ success: false, error: 'Rendimento base deve ser maior que 0' });
    return false;
  }
  if (Array.isArray(ingredients)) {
    for (const ing of ingredients) {
      if (!ing.name || typeof ing.name !== 'string') {
        res.status(400).json({ success: false, error: 'Cada ingrediente precisa ter um nome' });
        return false;
      }
      if (isNaN(Number(ing.quantity)) || Number(ing.quantity) < 0) {
        res.status(400).json({ success: false, error: 'Quantidade de ingrediente inválida' });
        return false;
      }
      if (isNaN(Number(ing.unit_cost)) || Number(ing.unit_cost) < 0) {
        res.status(400).json({ success: false, error: 'Custo unitário de ingrediente inválido' });
        return false;
      }
    }
  }
  return true;
}

// ── GET /api/technical-sheets — listar todas as fichas do tenant ──────────────

router.get('/', checkPermission('quotations:read'), async (req, res) => {
  try {
    const sheets = await model.getAllSheets(req.tenantId);
    res.json({ success: true, data: sheets });
  } catch (err) {
    console.error('[TechnicalSheets] GET /', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET /api/technical-sheets/:id — detalhe com ingredientes ─────────────────

router.get('/:id', checkPermission('quotations:read'), async (req, res) => {
  try {
    const sheet = await model.getSheetDetail(req.params.id, req.tenantId);
    if (!sheet) return res.status(404).json({ success: false, error: 'Ficha técnica não encontrada' });
    res.json({ success: true, data: sheet });
  } catch (err) {
    console.error('[TechnicalSheets] GET /:id', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET /api/technical-sheets/:id/cost — custo escalado para N convidados ────

router.get('/:id/cost', checkPermission('quotations:read'), async (req, res) => {
  try {
    const guests = Number(req.query.guests) || 0;
    const data = await model.getSheetCostForGuests(req.params.id, req.tenantId, guests);
    if (!data) return res.status(404).json({ success: false, error: 'Ficha técnica não encontrada' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[TechnicalSheets] GET /:id/cost', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── POST /api/technical-sheets — criar nova ficha ────────────────────────────

router.post('/', checkPermission('quotations:create'), async (req, res) => {
  if (!validateSheet(req.body, res)) return;
  try {
    const sheet = await model.createSheet({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json({ success: true, data: sheet });
  } catch (err) {
    console.error('[TechnicalSheets] POST /', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── PUT /api/technical-sheets/:id — atualizar ficha completa ─────────────────

router.put('/:id', checkPermission('quotations:update'), async (req, res) => {
  if (!validateSheet(req.body, res)) return;
  try {
    const sheet = await model.updateSheet(req.params.id, req.tenantId, req.body);
    if (!sheet) return res.status(404).json({ success: false, error: 'Ficha técnica não encontrada' });
    res.json({ success: true, data: sheet });
  } catch (err) {
    console.error('[TechnicalSheets] PUT /:id', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── DELETE /api/technical-sheets/:id ─────────────────────────────────────────

router.delete('/:id', checkPermission('quotations:delete'), async (req, res) => {
  try {
    const deleted = await model.deleteSheet(req.params.id, req.tenantId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Ficha técnica não encontrada' });
    res.json({ success: true, message: 'Ficha técnica excluída com sucesso' });
  } catch (err) {
    console.error('[TechnicalSheets] DELETE /:id', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
