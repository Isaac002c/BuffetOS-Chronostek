'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getAllEvents, getEventStats, deleteEvent, createEvent, updateEvent, checkEventConflict,
} from '../lib/eventsAPI.js';
import { getClients } from '../lib/clientsAPI.js';
import { getAllQuotations } from '../lib/quotationsAPI.js';
import Calendar from './Calendar';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  previsto:  { label: 'Previsto',   color: '#6366f1', bg: '#eef2ff' },
  confirmed: { label: 'Confirmado', color: '#16a34a', bg: '#f0fdf4' },
  pending:   { label: 'Pendente',   color: '#d97706', bg: '#fffbeb' },
  cancelled: { label: 'Cancelado',  color: '#dc2626', bg: '#fef2f2' },
};

const EVENT_TYPES = ['Casamento', '15 Anos', 'Corporativo', 'Formatura', 'Infantil', 'Ilha Gourmet', 'Outro'];

const EMPTY_FORM = {
  client_name: '', event_type: '', event_date: '',
  guest_count: 0, location: '', quotation_id: '',
  lead_id: '', status: 'confirmed', notes: '',
  team_ids: [],
};

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb', warning: '#d97706' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#fff', border: `1px solid ${colors[type] || colors.info}`,
      borderLeft: `4px solid ${colors[type] || colors.info}`, borderRadius: 8,
      padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 260,
      animation: 'slideInRight .25s ease',
    }}>
      <span style={{ fontSize: 16 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18 }}>×</button>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.previsto;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function EventDetail({ event, quotations, onEdit, onDelete, onGoogleCalendar, onClose }) {
  const quotation = quotations.find(q => q.id === event.quotation_id);
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            {event.event_type} — {event.client_name}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatusBadge status={event.status} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>×</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Local', value: event.location || '—' },
          { label: 'Convidados', value: event.guest_count || 0 },
          { label: 'Orçamento vinculado', value: quotation ? `${quotation.event_type || 'Orçamento'} — ${fmt(quotation.total_amount)}` : 'Nenhum' },
          { label: 'Notas', value: event.notes || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#0f172a' }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onGoogleCalendar}>Google Calendar</button>
        <button className="btn" onClick={() => onEdit(event)}>Editar</button>
        <button className="btn btn-icon danger" onClick={() => onDelete(event.id)}>Excluir</button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function BuffetEvents() {
  const [events, setEvents]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [clients, setClients]     = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const [editingEvent, setEditing]= useState(null);
  const [selectedEvent, setSelected] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [dateConflict, setConflict] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  // ── Pre-fill form from lead redirect ──────────────────────────────────────
  const searchParams = useSearchParams();
  const paramsApplied = useRef(false);

  useEffect(() => {
    if (paramsApplied.current) return;
    const fromLead   = searchParams.get('from_lead');
    const clientName = searchParams.get('client_name');
    // Ativa pré-preenchimento se veio de um lead (from_lead) OU se há client_name na URL
    if (!fromLead && !clientName) return;
    paramsApplied.current = true;
    setForm({
      ...EMPTY_FORM,
      client_name: clientName || '',
      event_type:  searchParams.get('event_type') || '',
      event_date:  searchParams.get('event_date') || '',
      lead_id:     fromLead && fromLead !== 'new' ? fromLead : '',
    });
    setShowForm(true);
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, statsData, clientsData, quotationsData] = await Promise.all([
        getAllEvents(),
        getEventStats().catch(() => null),
        getClients().catch(() => []),
        getAllQuotations().catch(() => []),
      ]);
      setEvents(eventsData || []);
      setStats(statsData || {});
      setClients(clientsData || []);
      setQuotations(quotationsData || []);
    } catch {
      showToast('Não foi possível carregar os dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill from quotation selection
  useEffect(() => {
    if (!form.quotation_id) return;
    const q = quotations.find(q => q.id === form.quotation_id);
    if (!q) return;
    const client = clients.find(c => c.id === q.client_id);
    setForm(prev => ({
      ...prev,
      client_name: prev.client_name || client?.name || '',
      event_type:  prev.event_type  || q.event_type  || '',
      event_date:  prev.event_date  || (q.event_date ? q.event_date.split('T')[0] : ''),
      guest_count: prev.guest_count || q.guest_count || 0,
    }));
  }, [form.quotation_id, quotations, clients]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));


  const handleDateChange = async (value) => {
    handleChange('event_date', value);
    if (!value) { setConflict(false); return; }
    try {
      const res = await checkEventConflict(value);
      if (res?.hasConflict) showToast('Conflito de data detectado!', 'warning');
      setConflict(!!res?.hasConflict);
    } catch { /* ignore */ }
  };

  const resetForm = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setConflict(false);
    setShowForm(false);
  }, []);

  const handleCreateFromCalendar = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setForm(prev => ({ ...prev, event_date: dateStr }));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name || !form.event_type || !form.event_date) {
      showToast('Cliente, tipo de evento e data são obrigatórios', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, guest_count: Number(form.guest_count) || 0 };
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
        showToast('Evento atualizado');
      } else {
        await createEvent(payload);
        showToast('Evento criado');
      }
      resetForm();
      await loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar evento', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (eventItem) => {
    setEditing(eventItem);
    setForm({
      client_name:  eventItem.client_name  || '',
      event_type:   eventItem.event_type   || '',
      event_date:   eventItem.event_date   ? eventItem.event_date.split('T')[0] : '',
      guest_count:  eventItem.guest_count  || 0,
      location:     eventItem.location     || '',
      quotation_id: eventItem.quotation_id || '',
      lead_id:      eventItem.lead_id      || '',
      status:       eventItem.status       || 'previsto',
      notes:        eventItem.notes        || '',
      team_ids:     eventItem.team_ids     || [],
    });
    setShowForm(true);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await deleteEvent(id);
      showToast('Evento removido');
      await loadData();
      if (editingEvent?.id === id) resetForm();
      if (selectedEvent?.id === id) setSelected(null);
    } catch (err) {
      showToast(err.message || 'Erro ao excluir', 'error');
    }
  };

  const handleGoogleCalendar = (eventItem) => {
    const title = encodeURIComponent(eventItem.event_type || 'Evento');
    const d = new Date(eventItem.event_date || eventItem.date || new Date());
    const end = new Date(d); end.setDate(end.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
    const dates = `${fmt(d)}/${fmt(end)}`;
    const details = encodeURIComponent(`Cliente: ${eventItem.client_name || '—'}\nLocal: ${eventItem.location || '—'}\n${eventItem.notes || ''}`);
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${dates}&details=${details}`, '_blank');
  };

  return (
    <div className="page-buffet-wrap" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Eventos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Agenda e gestão de eventos confirmados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { if (showForm && !editingEvent) resetForm(); else { resetForm(); setShowForm(true); } }}>
          {showForm && !editingEvent ? '✕ Fechar' : '+ Novo Evento'}
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      {(() => {
        const now = new Date();
        const confirmed = events.filter(e => e.status === 'confirmed' || e.status === 'confirmado').length;
        const pending   = events.filter(e => e.status === 'pending'   || e.status === 'pendente' || e.status === 'previsto').length;
        const thisMonth = events.filter(e => {
          const d = new Date(e.event_date || e.date || 0);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        return (
          <div className="events-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total',       value: events.length, accent: '#6366f1' },
              { label: 'Confirmados', value: confirmed,      accent: '#16a34a' },
              { label: 'Pendentes',   value: pending,        accent: '#d97706' },
              { label: 'Este mês',    value: thisMonth,      accent: '#0ea5e9' },
            ].map(k => (
              <div key={k.label} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '14px 16px', borderTop: `3px solid ${k.accent}`,
              }}>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 500 }}>{k.label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  {loading ? '—' : k.value}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── CALENDAR ── */}
      <div className="calendar-scroll-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <Calendar
          events={events}
          onDateSelect={() => {}}
          onEventCreate={handleCreateFromCalendar}
          onEventSelect={setSelected}
        />
      </div>

      {/* ── EVENT DETAIL ── */}
      {selectedEvent && !showForm && (
        <EventDetail
          event={selectedEvent} quotations={quotations}
          onEdit={handleEdit} onDelete={handleDelete}
          onGoogleCalendar={() => handleGoogleCalendar(selectedEvent)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── FORM ── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>×</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>

              {/* Quotation auto-fill hint */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Orçamento vinculado <span style={{ color: '#94a3b8', fontWeight: 400 }}>(auto-preenche campos abaixo)</span></label>
                <select className="form-input" value={form.quotation_id} onChange={e => handleChange('quotation_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {quotations.map(q => {
                    const c = clients.find(cl => cl.id === q.client_id);
                    return (
                      <option key={q.id} value={q.id}>
                        {c?.name || 'Cliente'} — {q.event_type || 'Evento'} — {fmt(q.total_amount)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div><label className="form-label">Cliente *</label>
                <input className="form-input" value={form.client_name} onChange={e => handleChange('client_name', e.target.value)} required placeholder="Nome do cliente" /></div>

              <div>
                <label className="form-label">
                  Data do evento *
                  {dateConflict && <span style={{ color: '#dc2626', marginLeft: 8, fontSize: 11 }}>⚠ Conflito!</span>}
                </label>
                <input className="form-input" type="date" value={form.event_date} onChange={e => handleDateChange(e.target.value)} required
                  style={{ borderColor: dateConflict ? '#fca5a5' : undefined }} />
              </div>

              <div><label className="form-label">Tipo de evento *</label>
                <select className="form-input" value={form.event_type} onChange={e => handleChange('event_type', e.target.value)} required>
                  <option value="">Selecionar...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>

              <div><label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>

              <div><label className="form-label">Convidados</label>
                <input className="form-input" type="number" min={0}
                  value={form.guest_count === 0 || form.guest_count === '' ? '' : form.guest_count}
                  placeholder="0"
                  onChange={e => handleChange('guest_count', e.target.value)} /></div>

              <div><label className="form-label">Local</label>
                <input className="form-input" value={form.location} onChange={e => handleChange('location', e.target.value)} placeholder="Endereço ou nome do local" /></div>

              <div><label className="form-label">Lead de origem</label>
                <input className="form-input" value={form.lead_id} onChange={e => handleChange('lead_id', e.target.value)} placeholder="ID do lead (opcional)" /></div>

              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Observações sobre o evento" style={{ resize: 'vertical', fontFamily: 'inherit' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : editingEvent ? 'Atualizar Evento' : 'Criar Evento'}
              </button>
              {editingEvent && <button type="button" className="btn" onClick={resetForm}>Cancelar</button>}
            </div>
          </form>
        </div>
      )}

      {/* ── EVENTS LIST ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            Todos os eventos <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>({events.length})</span>
          </h3>
          <button className="btn" onClick={loadData} disabled={loading}>{loading ? '...' : '↻ Atualizar'}</button>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Nenhum evento cadastrado</p>
            <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: 14 }}>Clique em um dia no calendário para criar.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Cliente / Tipo', 'Data', 'Local', 'Convidados', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 14px' }} onClick={() => setSelected(ev)}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{ev.client_name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{ev.event_type}</p>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{ev.location || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{ev.guest_count || 0}</td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={ev.status} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(ev)}>Editar</button>
                      <button className="btn btn-sm btn-icon danger" onClick={() => handleDelete(ev.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
