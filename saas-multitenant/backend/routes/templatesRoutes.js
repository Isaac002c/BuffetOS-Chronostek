// routes/templatesRoutes.js
// Rotas para gerenciamento de templates de eventos e simulação de orçamentos

const express = require('express');
const router = express.Router();
const templateModels = require('../models/templateModels');
const calculationService = require('../services/calculationService');
const pdfService = require('../services/pdfService');

// ============================================
// EVENT TEMPLATES - CRUD
// ============================================

// GET /api/event-templates
router.get('/', async (req, res) => {
  try {
    const templates = await templateModels.getAllEventTemplates(req.tenantId);
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('Erro ao buscar templates:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/event-templates
router.post('/', async (req, res) => {
  try {
    const { name, description, event_type } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name é obrigatório' });
    }

    const template = await templateModels.createEventTemplate({
      tenant_id: req.tenantId,
      name,
      description,
      event_type,
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    console.error('Erro ao criar template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/event-templates/:id
router.get('/:id', async (req, res) => {
  try {
    const template = await templateModels.getTemplateWithItems(req.params.id, req.tenantId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('Erro ao buscar template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/event-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, event_type } = req.body;

    const template = await templateModels.updateEventTemplate(
      req.params.id,
      { name, description, event_type },
      req.tenantId
    );

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    res.json({ success: true, data: template });
  } catch (err) {
    console.error('Erro ao atualizar template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/event-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await templateModels.deleteEventTemplate(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }
    res.json({ success: true, message: 'Template deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// TEMPLATE ITEMS - CRUD
// ============================================

// POST /api/event-templates/:id/items
router.post('/:id/items', async (req, res) => {
  try {
    const { name, unit, quantity_per_person, cost_per_unit } = req.body;

    if (!name || !unit || quantity_per_person === undefined || cost_per_unit === undefined) {
      return res.status(400).json({
        success: false,
        error: 'name, unit, quantity_per_person e cost_per_unit são obrigatórios',
      });
    }

    // Verificar se template existe
    const template = await templateModels.getEventTemplateById(req.params.id, req.tenantId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    const item = await templateModels.createTemplateItem({
      template_id: req.params.id,
      tenant_id: req.tenantId,
      name,
      unit,
      quantity_per_person,
      cost_per_unit,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('Erro ao criar item do template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/template-items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const { name, unit, quantity_per_person, cost_per_unit } = req.body;

    const item = await templateModels.updateTemplateItem(
      req.params.id,
      { name, unit, quantity_per_person, cost_per_unit },
      req.tenantId
    );

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/template-items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const deleted = await templateModels.deleteTemplateItem(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    res.json({ success: true, message: 'Item deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
