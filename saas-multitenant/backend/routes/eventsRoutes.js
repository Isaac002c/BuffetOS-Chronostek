const { safeError } = require('../utils/errorResponse');
const express = require('express');
const router = express.Router();
const eventModel = require('../models/eventModels');
const quotationModel = require('../models/quotationModels');
const { checkPermission } = require('../middlewares/checkPermission');
const { rateLimitByUser } = require('../middlewares/rateLimitByUser');
const { logAudit } = require('../utils/auditLog');

// Rate limit: máx 30 criações de evento por hora por usuário/tenant
const eventCreateLimiter = rateLimitByUser({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Muitos eventos criados. Tente novamente em 1 hora.',
});

router.post('/', checkPermission('events:create'), eventCreateLimiter, async (req, res) => {
  try {
    const {
      client_name,
      event_type,
      event_date,
      guest_count,
      location,
      notes,
      status = 'confirmed',
    } = req.body;

    // Sanitize UUID fields — empty strings crash the UUID cast
    const lead_id      = req.body.lead_id      || null;
    const quotation_id = req.body.quotation_id || null;

    if (!client_name || !event_type || !event_date) {
      return res.status(400).json({ success: false, error: 'client_name, event_type e event_date são obrigatórios' });
    }

    if (quotation_id) {
      const quotation = await quotationModel.getQuotationDetail(quotation_id, req.tenantId);
      if (!quotation) {
        return res.status(404).json({ success: false, error: 'Cotação associada não encontrada' });
      }
      if (quotation.status === 'cancelled') {
        return res.status(400).json({ success: false, error: 'Não é possível criar evento para cotação cancelada' });
      }
      // Prevenção de duplicata: impede converter o mesmo orçamento duas vezes
      const dupCheck = await require('../config/db').query(
        'SELECT id FROM events WHERE quotation_id = $1 AND tenant_id = $2 LIMIT 1',
        [quotation_id, req.tenantId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Este orçamento já foi convertido em evento anteriormente.' });
      }
    }

    // Conflict check only for confirmed events
    if (status === 'confirmed') {
      const hasConflict = await eventModel.checkDateConflicts(req.tenantId, event_date);
      if (hasConflict) {
        return res.status(400).json({ success: false, error: 'Conflito de data detectado para o evento' });
      }
    }

    const event = await eventModel.createEvent({
      lead_id,
      client_name,
      event_type,
      event_date,
      guest_count,
      location,
      quotation_id,
      notes,
      status,
      tenant_id: req.tenantId,
    });

    logAudit(req, 'event_created', 'event', event.id, { event_type, event_date, client_name });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error('Erro ao criar evento:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/period/:startDate/:endDate', checkPermission('events:read'), async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const events = await eventModel.getEventsByPeriod(req.tenantId, startDate, endDate);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos por período:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/upcoming', checkPermission('events:read'), async (req, res) => {
  try {
    const events = await eventModel.getAllUpcomingEvents(req.tenantId);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos futuros:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/', checkPermission('events:read'), async (req, res) => {
  try {
    const { status } = req.query;
    // Return all events (past + future) for the calendar and list views
    const startDate = new Date('2020-01-01');
    const endDate   = new Date('2030-12-31');
    let events = await eventModel.getEventsByPeriod(req.tenantId, startDate, endDate);

    if (status) {
      events = events.filter(e => e.status === status);
    }

    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/check-conflict/:date', checkPermission('events:read'), async (req, res) => {
  try {
    const hasConflict = await eventModel.checkDateConflicts(req.tenantId, req.params.date);
    res.json({ success: true, data: { hasConflict } });
  } catch (err) {
    console.error('Erro ao verificar conflito de data:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/stats/overview', checkPermission('events:read'), async (req, res) => {
  try {
    const stats = await eventModel.getEventStats(req.tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de eventos:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/:id', checkPermission('events:read'), async (req, res) => {
  try {
    const event = await eventModel.getEventDetail(req.params.id, req.tenantId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('Erro ao buscar evento:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.put('/:id', checkPermission('events:update'), async (req, res) => {
  try {
    const existingEvent = await eventModel.getEventDetail(req.params.id, req.tenantId);
    if (!existingEvent) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }

    const eventDate  = req.body.event_date || existingEvent.event_date;
    const status     = req.body.status     || existingEvent.status;
    // Sanitize UUID fields
    const quotationId = req.body.quotation_id === '' ? null : (req.body.quotation_id || existingEvent.quotation_id || null);
    if (req.body.quotation_id === '') req.body.quotation_id = null;
    if (req.body.lead_id      === '') req.body.lead_id      = null;

    if (quotationId) {
      const quotation = await quotationModel.getQuotationDetail(quotationId, req.tenantId);
      if (!quotation) {
        return res.status(404).json({ success: false, error: 'Cotação associada não encontrada' });
      }
      if (quotation.status === 'cancelled') {
        return res.status(400).json({ success: false, error: 'Não é possível associar evento a cotação cancelada' });
      }
    }

    const shouldCheckConflict = status === 'confirmed' && eventDate;
    if (shouldCheckConflict) {
      const dateChanged = String(eventDate) !== String(existingEvent.event_date);
      const pullingToConfirmed = existingEvent.status !== 'confirmed' || dateChanged;
      if (pullingToConfirmed) {
        const hasConflict = await eventModel.checkDateConflicts(req.tenantId, eventDate, 1, req.params.id);
        if (hasConflict) {
          return res.status(400).json({ success: false, error: 'Conflito de data detectado para o evento' });
        }
      }
    }

    const event = await eventModel.updateEvent(req.params.id, req.body, req.tenantId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('Erro ao atualizar evento:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.delete('/:id', checkPermission('events:delete'), async (req, res) => {
  try {
    const deleted = await eventModel.deleteEvent(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    logAudit(req, 'event_deleted', 'event', req.params.id, {});
    res.json({ success: true, message: 'Evento deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar evento:', err);
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
