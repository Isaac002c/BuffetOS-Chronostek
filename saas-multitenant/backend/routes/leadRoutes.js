const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const leadModel = require('../models/leadModels');
const quotationModel = require('../models/quotationModels');
const { checkPermission } = require('../middlewares/checkPermission');

function buildFilter(req) {
  const filter = { tenantId: req.tenantId };
  if (req.query.sellerId) {
    filter.sellerId = Number(req.query.sellerId);
  }
  return filter;
}

router.get('/', checkPermission('leads:read'), async (req, res) => {
  try {
    const leads = await leadModel.getAllLeads(req.tenantId);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/filter', checkPermission('leads:read'), async (req, res) => {
  try {
    const leads = await leadModel.getLeadsByFilter(buildFilter(req));
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao filtrar leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/stats/pipeline', checkPermission('leads:read'), async (req, res) => {
  try {
    const metrics = await leadModel.getPipelineMetrics(buildFilter(req));
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Erro ao buscar pipeline de leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/stats/status', checkPermission('leads:read'), async (req, res) => {
  try {
    const stats = await leadModel.getLeadsCountByStatus(buildFilter(req));
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de status de leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/stats/source', checkPermission('leads:read'), async (req, res) => {
  try {
    const stats = await leadModel.getLeadsCountBySource(buildFilter(req));
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de origem de leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/stats/monthly', checkPermission('leads:read'), async (req, res) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const metrics = await leadModel.getMonthlyMetrics(buildFilter(req), months);
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Erro ao buscar métricas mensais de leads:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/inactive/:days?', checkPermission('leads:read'), async (req, res) => {
  try {
    const days = req.params.days ? Number(req.params.days) : (req.query.days ? Number(req.query.days) : 7);
    const leads = await leadModel.getInactiveLeads(buildFilter(req), days);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao buscar leads inativos:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/:id/convert-to-quotation', checkPermission('quotations:convert'), async (req, res) => {
  try {
    const lead = await leadModel.getLeadById(req.params.id, req.tenantId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    // Impede duplicação: verifica orçamento draft com lead_id já existente
    const existingCheck = await require('../config/db').query(
      `SELECT id FROM quotations WHERE lead_id = $1 AND tenant_id = $2 AND status = 'draft' LIMIT 1`,
      [lead.id, req.tenantId]
    ).catch(() => ({ rows: [] }));

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um orçamento em rascunho para este lead',
        quotation_id: existingCheck.rows[0].id,
      });
    }

    const quotation = await quotationModel.createQuotation({
      tenant_id:   req.tenantId,
      client_id:   lead.client_id || null,
      event_type:  lead.event_type || '',
      guest_count: 0,
      event_date:  lead.event_date || null,
      items:       [],
      notes:       `Convertido do lead: ${lead.name}`,
    });

    // Atualiza lead com referência ao orçamento criado
    await leadModel.updateLead(lead.id, { ...lead, status: 'proposta' }, req.tenantId).catch(() => null);

    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    console.error('Erro ao converter lead em orçamento:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/:id', checkPermission('leads:read'), async (req, res) => {
  try {
    const lead = await leadModel.getLeadById(req.params.id, req.tenantId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Erro ao buscar lead:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/', checkPermission('leads:create'), async (req, res) => {
  try {
    // Extrair apenas os campos permitidos — previne mass assignment
    const { name, email, phone, company, value, status, source, stage, event_type, event_date, next_action } = req.body;
    const lead = await leadModel.createLead({
      name, email, phone, company, value, status, source, stage,
      event_type, event_date, next_action,
      tenant_id: req.tenantId,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    res.status(500).json({ success: false, error: 'Erro ao criar lead' });
  }
});

router.put('/:id', checkPermission('leads:update'), async (req, res) => {
  try {
    const updated = await leadModel.updateLead(req.params.id, req.body, req.tenantId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.delete('/:id', checkPermission('leads:delete'), async (req, res) => {
  try {
    const removed = await leadModel.deleteLead(req.params.id, req.tenantId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: removed, message: 'Lead removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
