'use client';

import { useState, useEffect } from 'react';
import {
  getAllEvents,
  getEventStats,
  deleteEvent,
  createEvent,
  updateEvent,
  checkEventConflict,
} from '../lib/eventsAPI.js';
import { getClients } from '../lib/clientsAPI.js';
import { getAllQuotations } from '../lib/quotationsAPI.js';
import Calendar from './Calendar';

export default function BuffetEvents() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({
    client_name: '',
    event_type: '',
    event_date: '',
    guest_count: 0,
    location: '',
    quotation_id: '',
    status: 'confirmed',
    notes: '',
  });
  const [dateConflict, setDateConflict] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEventFromCalendar = (date) => {
    const selectedDate = date.toISOString().split('T')[0];
    setSelectedCalendarDate(date);
    setForm((prev) => ({ ...prev, event_date: selectedDate }));
    setShowForm(true);
  };

  const handleSelectEvent = (eventItem) => {
    setSelectedEvent(eventItem);
    setShowForm(false);
  };

  const formatGoogleDate = (dateInput) => {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const getGoogleCalendarDateRange = (dateInput) => {
    const start = new Date(dateInput);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
  };

  const generateGoogleCalendarUrl = (eventItem) => {
    const title = encodeURIComponent(eventItem.event_type || 'Evento');
    const dates = getGoogleCalendarDateRange(eventItem.event_date || eventItem.date || new Date());
    const details = encodeURIComponent([
      eventItem.notes || '',
      `Cliente: ${eventItem.client_name || 'Não informado'}`,
      `Local: ${eventItem.location || 'Não informado'}`,
      `Status: ${eventItem.status || 'N/A'}`,
    ].filter(Boolean).join('\n'));
    const location = encodeURIComponent(eventItem.location || '');
    return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${dates}&details=${details}${location ? `&location=${location}` : ''}`;
  };

  const handleOpenGoogleCalendar = (eventItem) => {
    const url = generateGoogleCalendarUrl(eventItem);
    window.open(url, '_blank');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, statsData, clientsData, quotationsData] = await Promise.all([
        getAllEvents(),
        getEventStats().catch(() => null),
        getClients(),
        getAllQuotations(),
      ]);
      setEvents(eventsData || []);
      setStats(statsData || {});
      setClients(clientsData || []);
      setQuotations(quotationsData || []);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setMessage('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = async (value) => {
    handleFieldChange('event_date', value);
    if (value) {
      try {
        const response = await checkEventConflict(value);
        setDateConflict(response.hasConflict);
      } catch (err) {
        console.error('Erro ao verificar conflito:', err);
      }
    } else {
      setDateConflict(false);
    }
  };

  useEffect(() => {
    if (!form.quotation_id) return;
    const selected = quotations.find((q) => q.id === form.quotation_id);
    if (selected && !form.client_name) {
      const client = clients.find((c) => c.id === selected.client_id);
      if (client) {
        setForm((prev) => ({ ...prev, client_name: client.name }));
      }
    }
  }, [form.quotation_id, quotations, clients]);

  const resetForm = () => {
    setEditingEvent(null);
    setForm({ client_name: '', event_type: '', event_date: '', guest_count: 0, location: '', quotation_id: '', status: 'confirmed', notes: '' });
    setDateConflict(false);
    setShowForm(false);
  };

  const filteredEvents = events.filter((eventItem) => {
    const matchesClient = filterClient ? eventItem.client_name?.toLowerCase().includes(filterClient.toLowerCase()) : true;
    const matchesStatus = filterStatus ? eventItem.status === filterStatus : true;
    const matchesType = filterEventType ? eventItem.event_type?.toLowerCase().includes(filterEventType.toLowerCase()) : true;
    const eventDate = eventItem.event_date ? new Date(eventItem.event_date) : null;
    const matchesFrom = filterDateFrom ? eventDate && eventDate >= new Date(filterDateFrom) : true;
    const matchesTo = filterDateTo ? eventDate && eventDate <= new Date(filterDateTo) : true;
    return matchesClient && matchesStatus && matchesType && matchesFrom && matchesTo;
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.client_name || !form.event_type || !form.event_date) {
      setMessage('Cliente, tipo de evento e data são obrigatórios.');
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, form);
        setMessage('Evento atualizado com sucesso.');
      } else {
        await createEvent(form);
        setMessage('Evento criado com sucesso.');
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar evento:', err);
      setMessage(err.message || 'Erro ao salvar evento.');
    }
  };

  const handleEditEvent = (eventItem) => {
    setEditingEvent(eventItem);
    setForm({
      client_name: eventItem.client_name || '',
      event_type: eventItem.event_type || '',
      event_date: eventItem.event_date ? eventItem.event_date.split('T')[0] : '',
      guest_count: eventItem.guest_count || 0,
      location: eventItem.location || '',
      quotation_id: eventItem.quotation_id || '',
      status: eventItem.status || 'confirmed',
      notes: eventItem.notes || '',
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    setSelectedEvent(null);
    setMessage('Edição de evento cancelada.');
  };

  const closeEventDetails = () => setSelectedEvent(null);

  const handleUpdateEventStatus = async (eventItem, status) => {
    if (!window.confirm(`Deseja marcar o evento como ${status}?`)) return;
    try {
      await updateEvent(eventItem.id, { status });
      setMessage(`Evento ${status === 'cancelled' ? 'cancelado' : 'atualizado'} com sucesso.`);
      loadData();
      if (selectedEvent && selectedEvent.id === eventItem.id) {
        setSelectedEvent({ ...selectedEvent, status });
      }
    } catch (err) {
      console.error('Erro ao atualizar status do evento:', err);
      setMessage(err.message || 'Erro ao atualizar status do evento.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão do evento?')) return;
    try {
      await deleteEvent(id);
      setMessage('Evento removido com sucesso.');
      loadData();
      if (editingEvent && editingEvent.id === id) resetForm();
      if (selectedEvent && selectedEvent.id === id) setSelectedEvent(null);
    } catch (err) {
      console.error('Erro ao excluir evento:', err);
      setMessage(err.message || 'Erro ao excluir evento.');
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <h2>Calendário de Eventos</h2>
          <p className="section-subtitle">Selecione um dia para visualizar detalhes e criar um novo evento.</p>
        </div>
      </div>

      {message && <div className="notice-message">{message}</div>}

      <div className="section-block">
        <Calendar
          events={events}
          onDateSelect={(date) => setSelectedCalendarDate(date)}
          onEventCreate={handleCreateEventFromCalendar}
          onEventSelect={handleSelectEvent}
        />
      </div>

      {showForm && (
        <div className="section-block">
          <div className="section-header">
            <h3>{editingEvent ? 'Editar evento' : 'Novo evento'}</h3>
            <button type="button" className="btn-small" onClick={resetForm}>
              Fechar
            </button>
          </div>

          <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Cliente</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => handleFieldChange('client_name', e.target.value)}
                placeholder="Nome do cliente ou contato"
              />
            </div>

            <div className="form-row">
              <label>Data do evento</label>
              <input type="date" value={form.event_date} onChange={(e) => handleDateChange(e.target.value)} />
              {dateConflict && <p className="warning-text">Conflito detectado nesta data!</p>}
            </div>

            <div className="form-row">
              <label>Tipo de evento</label>
              <input
                type="text"
                value={form.event_type}
                onChange={(e) => handleFieldChange('event_type', e.target.value)}
                placeholder="Casamento, Corporativo, Festa"
              />
            </div>

            <div className="form-row">
              <label>Convidados</label>
              <input
                type="number"
                min={0}
                value={form.guest_count}
                onChange={(e) => handleFieldChange('guest_count', Number(e.target.value) || 0)}
              />
            </div>

            <div className="form-row">
              <label>Local</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                placeholder="Local do evento"
              />
            </div>

            <div className="form-row">
              <label>Cotação relacionada</label>
              <select value={form.quotation_id} onChange={(e) => handleFieldChange('quotation_id', e.target.value)}>
                <option value="">Nenhuma</option>
                {quotations.map((quotation) => {
                  const client = clients.find((c) => c.id === quotation.client_id);
                  const clientName = client ? client.name : quotation.client_id;
                  return (
                    <option key={quotation.id} value={quotation.id}>
                      {clientName} — {quotation.event_type || 'Evento'} — R$ {Number(quotation.total_amount || 0).toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-row">
              <label>Status</label>
              <select value={form.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div className="form-row">
              <label>Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Detalhes do evento"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingEvent ? 'Atualizar evento' : 'Criar evento'}
              </button>
              {editingEvent && (
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {selectedEvent && (
        <div className="section-block">
          <div className="section-header">
            <h3>Detalhes do evento</h3>
            <button className="btn-small" onClick={closeEventDetails}>
              Fechar
            </button>
          </div>
          <div className="details-grid">
            <div>
              <strong>Cliente:</strong>
              <p>{selectedEvent.client_name || 'Sem nome'}</p>
            </div>
            <div>
              <strong>Tipo:</strong>
              <p>{selectedEvent.event_type || '-'}</p>
            </div>
            <div>
              <strong>Data:</strong>
              <p>{selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <strong>Local:</strong>
              <p>{selectedEvent.location || '-'}</p>
            </div>
            <div>
              <strong>Status:</strong>
              <p>{selectedEvent.status || '-'}</p>
            </div>
            <div>
              <strong>Cotação relacionada:</strong>
              <p>{
                selectedEvent.quotation_id
                  ? (() => {
                      const quotation = quotations.find((q) => q.id === selectedEvent.quotation_id);
                      return quotation ? `${quotation.event_type || 'Cotação'} — R$ ${Number(quotation.total_amount || 0).toFixed(2)}` : 'Não encontrada';
                    })()
                  : 'Nenhuma'
              }</p>
            </div>
            <div>
              <strong>Notas:</strong>
              <p>{selectedEvent.notes || 'Sem notas'}</p>
            </div>
          </div>
          <div className="details-actions">
            <button type="button" className="btn-primary" onClick={() => handleOpenGoogleCalendar(selectedEvent)}>
              Abrir no Google Calendar
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleEditEvent(selectedEvent)}>
              Editar evento
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleDelete(selectedEvent.id)}>
              Excluir evento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
