const express = require('express');
const router = express.Router();
const eventModel = require('../models/eventModels');
const quotationModel = require('../models/quotationModels');

router.post('/', async (req, res) => {
  try {
    const {
      lead_id,
      client_name,
      event_type,
      event_date,
      guest_count,
      location,
      quotation_id,
      notes,
      status = 'confirmed',
    } = req.body;

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
    }

    const shouldCheckConflict = status === 'confirmed';
    if (shouldCheckConflict) {
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

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error('Erro ao criar evento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/period/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const events = await eventModel.getEventsByPeriod(req.tenantId, startDate, endDate);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos por período:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const events = await eventModel.getAllUpcomingEvents(req.tenantId);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos futuros:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    let events = await eventModel.getEventsByPeriod(req.tenantId, startDate, endDate);
    
    if (status) {
      events = events.filter(e => e.status === status);
    }
    
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Erro ao buscar eventos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/check-conflict/:date', async (req, res) => {
  try {
    const hasConflict = await eventModel.checkDateConflicts(req.tenantId, req.params.date);
    res.json({ success: true, data: { hasConflict } });
  } catch (err) {
    console.error('Erro ao verificar conflito de data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await eventModel.getEventStats(req.tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Erro ao buscar stats de eventos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await eventModel.getEventDetail(req.params.id, req.tenantId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('Erro ao buscar evento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existingEvent = await eventModel.getEventDetail(req.params.id, req.tenantId);
    if (!existingEvent) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }

    const eventDate = req.body.event_date || existingEvent.event_date;
    const status = req.body.status || existingEvent.status;
    const quotationId = req.body.quotation_id || existingEvent.quotation_id;

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
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await eventModel.deleteEvent(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    res.json({ success: true, message: 'Evento deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar evento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
