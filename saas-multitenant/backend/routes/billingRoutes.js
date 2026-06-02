const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const billingModel = require('../models/billingModels');
const { checkPermission } = require('../middlewares/checkPermission');

router.get('/stats', checkPermission('finance:read'), async (req, res) => {
  try {
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const stats = await billingModel.getDashboardStats(req.tenantId, month, year);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar dashboard billing:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/revenue/monthly', checkPermission('finance:read'), async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const revenue = await billingModel.getRevenueByMonth(req.tenantId, year);
    res.json({ success: true, data: revenue });
  } catch (err) {
    console.error('Erro ao buscar revenue mensal:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/revenue/comparison', checkPermission('finance:read'), async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const comparison = await billingModel.getRevenueComparison(req.tenantId, year);
    res.json({ success: true, data: comparison });
  } catch (err) {
    console.error('Erro ao buscar comparativo de revenue:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/revenue/forecast', checkPermission('finance:read'), async (req, res) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const forecast = await billingModel.getRevenueForecast(req.tenantId, months);
    res.json({ success: true, data: forecast });
  } catch (err) {
    console.error('Erro ao buscar forecast de revenue:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/pipeline/value', checkPermission('finance:read'), async (req, res) => {
  try {
    const pipelineValue = await billingModel.getLeadPipelineValue(req.tenantId);
    res.json({ success: true, data: pipelineValue });
  } catch (err) {
    console.error('Erro ao buscar pipeline value:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/events/breakdown', checkPermission('finance:read'), async (req, res) => {
  try {
    const breakdown = await billingModel.getEventTypeBreakdown(req.tenantId);
    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('Erro ao buscar event breakdown:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/sales/clients', checkPermission('finance:read'), async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const sales = await billingModel.getSalesByClient(req.tenantId, year);
    res.json({ success: true, data: sales });
  } catch (err) {
    console.error('Erro ao buscar vendas por cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/summary/:month/:year', checkPermission('finance:read'), async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    const summary = await billingModel.getMonthlySummary(req.tenantId, month, year);
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('Erro ao buscar summary mensal:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/metrics/conversion', checkPermission('finance:read'), async (req, res) => {
  try {
    const metrics = await billingModel.getConversionMetrics(req.tenantId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Erro ao buscar conversion metrics:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
