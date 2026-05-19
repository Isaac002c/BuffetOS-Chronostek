const express = require('express');
const router = express.Router();
const quotationModel = require('../models/quotationModels');
const calculationService = require('../services/calculationService');
const pdfService = require('../services/pdfService');

// ============================================
// SIMULAÇÃO DE ORÇAMENTO
// ============================================

router.post('/simulate', async (req, res) => {
  try {
    const { template_id, number_of_guests, margin_percentage = 0, discount = 0 } = req.body;

    // Validar inputs
    const errors = calculationService.validateSimulationInput({
      template_id,
      number_of_guests,
      margin_percentage,
      discount,
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Executar simulação
    const simulation = await calculationService.simulateQuotation({
      template_id,
      number_of_guests,
      margin_percentage,
      discount,
      tenant_id: req.tenantId,
    });

    res.json({ success: true, data: simulation });
  } catch (err) {
    console.error('Erro ao simular orçamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GERAÇÃO DE PROPOSTA EM PDF
// ============================================

router.post('/:id/generate-proposal', async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }

    const {
      company_name = 'Buffet OS',
      company_logo = '',
      notes = '',
      payment_conditions = '50% de entrada e 50% 15 dias antes do evento',
      validity_days = 30,
    } = req.body;

    // Gerar HTML da proposta
    const proposalHTML = pdfService.generateProposalHTML({
      client_name: quotation.client_name || 'Cliente',
      event_type: quotation.event_type || 'Evento',
      event_date: quotation.event_date,
      number_of_guests: quotation.guest_count || 0,
      items: quotation.items || [],
      total_cost: quotation.total_amount || 0,
      margin_percentage: quotation.margin_percentage || 0,
      margin_amount: quotation.margin_amount || 0,
      price_with_margin: quotation.price_with_margin || quotation.total_amount,
      discount: quotation.discount || 0,
      final_price: quotation.total_amount || 0,
      company_name,
      company_logo,
      notes,
      payment_conditions,
      validity_days,
      template_name: quotation.template_name || 'Serviço de Buffet',
      template_description: quotation.template_description || '',
    });

    // Retornar HTML como resposta
    // Em produção, você usaria Puppeteer para converter para PDF
    res.json({
      success: true,
      data: {
        html: proposalHTML,
        quotation_id: req.params.id,
        message: 'Use a HTML para gerar PDF via Puppeteer ou similar'
      }
    });
  } catch (err) {
    console.error('Erro ao gerar proposta:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// QUOTATIONS EXISTENTES
// ============================================


router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let quotations = await quotationModel.getAllQuotations(req.tenantId);
    
    if (status) {
      quotations = quotations.filter(q => q.status === status);
    }
    
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Erro ao buscar quotations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const quotations = await quotationModel.getQuotationsByClient(clientId, req.tenantId);
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Erro ao buscar quotations por cliente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Erro ao buscar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const quotation = await quotationModel.createQuotation({
      ...req.body,
      tenant_id: req.tenantId,
    });
    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    console.error('Erro ao criar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedQuotation = await quotationModel.updateQuotation(req.params.id, req.body, req.tenantId);
    if (!updatedQuotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, data: updatedQuotation });
  } catch (err) {
    console.error('Erro ao atualizar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    if (quotation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Não é possível aprovar uma cotação cancelada.' });
    }

    const approvedQuotation = await quotationModel.approveQuotation(req.params.id, req.tenantId);
    res.json({ success: true, data: approvedQuotation });
  } catch (err) {
    console.error('Erro ao aprovar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    if (quotation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cotação já está cancelada.' });
    }

    const cancelledQuotation = await quotationModel.cancelQuotation(req.params.id, req.tenantId);
    res.json({ success: true, data: cancelledQuotation });
  } catch (err) {
    console.error('Erro ao cancelar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await quotationModel.deleteQuotation(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, message: 'Quotation deletada com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    const duplicated = await quotationModel.duplicateQuotation(req.params.id, req.tenantId, clientId);
    if (!duplicated) {
      return res.status(404).json({ success: false, error: 'Quotation original não encontrada' });
    }

    res.status(201).json({ success: true, data: duplicated });
  } catch (err) {
    console.error('Erro ao duplicar quotation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
