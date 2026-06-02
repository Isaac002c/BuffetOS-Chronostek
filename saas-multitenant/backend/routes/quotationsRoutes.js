const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const quotationModel = require('../models/quotationModels');
const calculationService = require('../services/calculationService');
const pdfService = require('../services/pdfService');
const { checkPermission } = require('../middlewares/checkPermission');
const { rateLimitByUser } = require('../middlewares/rateLimitByUser');
const { logAudit } = require('../utils/auditLog');

// Rate limit: máx 60 criações de orçamento por hora por usuário/tenant
const quotationCreateLimiter = rateLimitByUser({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'Muitos orçamentos criados. Tente novamente em 1 hora.',
});

// ── Validação de payload ──────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['draft', 'pending', 'approved', 'active', 'completed', 'cancelled'];

function validateQuotationBody(body, res) {
  const { guest_count, discount_percent, status, event_type, items } = body;

  if (guest_count !== undefined) {
    const n = Number(guest_count);
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      res.status(400).json({ success: false, error: 'guest_count deve ser um inteiro entre 0 e 100000' });
      return false;
    }
  }

  if (discount_percent !== undefined) {
    const d = Number(discount_percent);
    if (isNaN(d) || d < 0 || d > 100) {
      res.status(400).json({ success: false, error: 'discount_percent deve ser um número entre 0 e 100' });
      return false;
    }
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ success: false, error: `status inválido. Valores permitidos: ${ALLOWED_STATUSES.join(', ')}` });
    return false;
  }

  if (event_type !== undefined && typeof event_type === 'string' && event_type.length > 200) {
    res.status(400).json({ success: false, error: 'event_type excede o tamanho máximo permitido' });
    return false;
  }

  if (Array.isArray(items)) {
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.price ?? item.unit_price ?? 0);
      if (isNaN(qty) || qty < 0 || qty > 100000) {
        res.status(400).json({ success: false, error: 'Quantidade de item inválida' });
        return false;
      }
      if (isNaN(price) || price < 0 || price > 10000000) {
        res.status(400).json({ success: false, error: 'Preço de item inválido' });
        return false;
      }
    }
  }

  return true;
}

// ============================================
// SIMULAÇÃO DE ORÇAMENTO
// ============================================

router.post('/simulate', checkPermission('quotations:read'), async (req, res) => {
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
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ============================================
// GERAÇÃO DE PROPOSTA EM PDF
// ============================================

router.post('/:id/generate-proposal', checkPermission('quotations:read'), async (req, res) => {
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
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ============================================
// QUOTATIONS EXISTENTES
// ============================================


router.get('/', checkPermission('quotations:read'), async (req, res) => {
  try {
    const { status } = req.query;
    let quotations = await quotationModel.getAllQuotations(req.tenantId);
    
    if (status) {
      quotations = quotations.filter(q => q.status === status);
    }
    
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Erro ao buscar quotations:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/client/:clientId', checkPermission('quotations:read'), async (req, res) => {
  try {
    const { clientId } = req.params;
    const quotations = await quotationModel.getQuotationsByClient(clientId, req.tenantId);
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('Erro ao buscar quotations por cliente:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/:id', checkPermission('quotations:read'), async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Erro ao buscar quotation:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/', checkPermission('quotations:create'), quotationCreateLimiter, async (req, res) => {
  try {
    if (!validateQuotationBody(req.body, res)) return;

    // Sanitize UUID fields — empty strings crash the UUID cast in PostgreSQL
    const body = { ...req.body };
    if (!body.client_id) body.client_id = null;
    if (!body.lead_id)   body.lead_id   = null;

    const quotation = await quotationModel.createQuotation({
      ...body,
      tenant_id: req.tenantId,
    });
    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    console.error('Erro ao criar quotation:', err);
    res.status(500).json({ success: false, error: 'Erro ao criar orçamento' });
  }
});

router.put('/:id', checkPermission('quotations:update'), async (req, res) => {
  try {
    if (!validateQuotationBody(req.body, res)) return;

    // Sanitiza campos que não podem ser string vazia no banco
    const body = { ...req.body };
    if (!body.client_id)   body.client_id   = null;
    if (!body.lead_id)     body.lead_id     = null;
    if (!body.event_date)  body.event_date  = null;   // "" → null evita erro de tipo DATE

    const updatedQuotation = await quotationModel.updateQuotation(req.params.id, body, req.tenantId);
    if (!updatedQuotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, data: updatedQuotation });
  } catch (err) {
    console.error('Erro ao atualizar quotation:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar orçamento' });
  }
});

router.post('/:id/approve', checkPermission('quotations:approve'), async (req, res) => {
  try {
    const quotation = await quotationModel.getQuotationDetail(req.params.id, req.tenantId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    if (quotation.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Não é possível aprovar uma cotação cancelada.' });
    }

    const approvedQuotation = await quotationModel.approveQuotation(req.params.id, req.tenantId);
    logAudit(req, 'quotation_approved', 'quotation', req.params.id, { status: 'approved' });
    res.json({ success: true, data: approvedQuotation });
  } catch (err) {
    console.error('Erro ao aprovar quotation:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/:id/cancel', checkPermission('quotations:cancel'), async (req, res) => {
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
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.delete('/:id', checkPermission('quotations:delete'), async (req, res) => {
  try {
    const deleted = await quotationModel.deleteQuotation(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quotation não encontrada' });
    }
    res.json({ success: true, message: 'Quotation deletada com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar quotation:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/:id/duplicate', checkPermission('quotations:create'), async (req, res) => {
  try {
    const clientId = req.body.clientId || null;
    const leadId   = req.body.leadId   || null;

    const duplicated = await quotationModel.duplicateQuotation(req.params.id, req.tenantId, clientId, leadId);
    if (!duplicated) {
      return res.status(404).json({ success: false, error: 'Quotation original não encontrada' });
    }

    res.status(201).json({ success: true, data: duplicated });
  } catch (err) {
    console.error('Erro ao duplicar quotation:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
