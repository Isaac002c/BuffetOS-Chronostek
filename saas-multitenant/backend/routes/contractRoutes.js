const express = require('express');
const router = express.Router();
const contractModel = require('../models/contractModels');
const { checkPermission } = require('../middlewares/checkPermission');

router.get('/aprs-stats', checkPermission('contracts:read'), async (req, res) => {
  try {
    const stats = await contractModel.getAPRsByStage(req.tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/by-organ', checkPermission('contracts:read'), async (req, res) => {
  try {
    const data = await contractModel.getContractsGroupedByOrgan(req.tenantId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/dashboard', checkPermission('contracts:read'), async (req, res) => {
  try {
    const [dashboard, alerts] = await Promise.all([
      contractModel.getDashboardStats(req.tenantId),
      contractModel.getAlerts(req.tenantId),
    ]);
    res.json({ success: true, data: { dashboard, alerts } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/client/:clientId', checkPermission('contracts:read'), async (req, res) => {
  try {
    const contracts = await contractModel.getContractsByClient(req.params.clientId, req.tenantId);
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/service/:serviceId', checkPermission('contracts:read'), async (req, res) => {
  try {
    const contracts = await contractModel.getContractsByService(
      req.params.serviceId,
      req.tenantId,
      req.query.client_id || null
    );
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', checkPermission('contracts:read'), async (req, res) => {
  try {
    const contracts = await contractModel.getAllContracts(req.tenantId);
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', checkPermission('contracts:create'), async (req, res) => {
  try {
    const contract = await contractModel.createContract({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', checkPermission('contracts:update'), async (req, res) => {
  try {
    const contract = await contractModel.updateContract(req.params.id, req.body, req.tenantId);
    if (!contract) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', checkPermission('contracts:delete'), async (req, res) => {
  try {
    const contract = await contractModel.deleteContract(req.params.id, req.tenantId);
    if (!contract) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', checkPermission('contracts:read'), async (req, res) => {
  try {
    const contract = await contractModel.getContractById(req.params.id, req.tenantId);
    if (!contract) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;