const express = require('express');
const router = express.Router();
const leadModel = require('../models/leadModels');

function buildFilter(req) {
  const filter = { tenantId: req.tenantId };
  if (req.query.sellerId) {
    filter.sellerId = Number(req.query.sellerId);
  }
  return filter;
}

router.get('/', async (req, res) => {
  try {
    const leads = await leadModel.getAllLeads(req.tenantId);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/filter', async (req, res) => {
  try {
    const leads = await leadModel.getLeadsByFilter(buildFilter(req));
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao filtrar leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats/pipeline', async (req, res) => {
  try {
    const metrics = await leadModel.getPipelineMetrics(buildFilter(req));
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Erro ao buscar pipeline de leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats/status', async (req, res) => {
  try {
    const stats = await leadModel.getLeadsCountByStatus(buildFilter(req));
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de status de leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats/source', async (req, res) => {
  try {
    const stats = await leadModel.getLeadsCountBySource(buildFilter(req));
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de origem de leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats/monthly', async (req, res) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const metrics = await leadModel.getMonthlyMetrics(buildFilter(req), months);
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Erro ao buscar métricas mensais de leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inactive/:days?', async (req, res) => {
  try {
    const days = req.params.days ? Number(req.params.days) : 7;
    const leads = await leadModel.getInactiveLeads(buildFilter(req), days);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao buscar leads inativos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inactive', async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 7;
    const leads = await leadModel.getInactiveLeads(buildFilter(req), days);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Erro ao buscar leads inativos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await leadModel.getLeadById(req.params.id, req.tenantId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Erro ao buscar lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const lead = await leadModel.createLead({
      ...req.body,
      tenant_id: req.tenantId,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await leadModel.updateLead(req.params.id, req.body, req.tenantId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const removed = await leadModel.deleteLead(req.params.id, req.tenantId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
    res.json({ success: true, data: removed, message: 'Lead removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
