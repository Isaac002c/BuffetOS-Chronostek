'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getLeads, createLead, updateLead, deleteLead,
  getLeadPipelineStats,
} from '../lib/leadsAPI.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'novo',        label: 'Entrada',        color: '#6366f1', bg: '#eef2ff' },
  { key: 'contactado',  label: 'Em atendimento', color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'proposta',    label: 'Em proposta',    color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'negociacao',  label: 'Negociação',     color: '#f59e0b', bg: '#fffbeb' },
  { key: 'ganho',       label: 'Fechado',        color: '#16a34a', bg: '#f0fdf4' },
  { key: 'perdido',     label: 'Perdido',        color: '#dc2626', bg: '#fef2f2' },
];

const SOURCES = ['web', 'indicação', 'parceiro', 'instagram', 'outro'];
const EVENT_TYPES = ['Casamento', '15 Anos', 'Corporativo', 'Formatura', 'Infantil', 'Outro'];

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  status: 'novo', source: 'web',
  event_type: '', event_date: '',
};

// Máscara de telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
const formatPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d.length ? `(${d}` : '';
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose, action, actionLabel }) {
  useEffect(() => { const t = setTimeout(onClose, action ? 8000 : 3500); return () => clearTimeout(t); }, [onClose, action]);
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#fff', border: `1px solid ${colors[type]}`,
      borderLeft: `4px solid ${colors[type]}`, borderRadius: 8,
      padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 260,
      animation: 'slideInRight .25s ease',
    }}>
      <span style={{ fontSize: 16 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      {action && (
        <button onClick={action} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: colors[type] || '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>{actionLabel || 'Ver'}</button>
      )}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18 }}>×</button>
    </div>
  );
}

// ─── STAGE BADGE ──────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  // Backward compat: map old DB values to current STAGES
  const keyMap = { qualificado: 'contactado' };
  const cfg = STAGES.find(s => s.key === (keyMap[stage] || stage)) || STAGES[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── KANBAN CARD ──────────────────────────────────────────────────────────────

function LeadCard({ lead, onEdit, onDelete, onConvert, onWhatsApp, isDragging }) {
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, cursor: 'grab', opacity: isDragging ? .5 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,.06)', transition: 'box-shadow .15s',
        marginBottom: 8,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{lead.name}</p>
      {lead.event_type && (
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#475569' }}>
          🎪 {lead.event_type}{lead.event_date ? ` · ${new Date(lead.event_date).toLocaleDateString('pt-BR')}` : ''}
        </p>
      )}
      {lead.value > 0 && (
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(lead.value)}</p>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => onEdit(lead)} style={btnStyle('#f1f5f9', '#0f172a')}>Editar</button>
        {lead.phone && (
          <button onClick={() => onWhatsApp(lead)} style={btnStyle('#dcfce7', '#15803d')} title="Abrir WhatsApp">
            WhatsApp
          </button>
        )}
        <button onClick={() => onConvert(lead)} style={btnStyle('#eff6ff', '#1d4ed8')} title="Criar orçamento">
          → Orçamento
        </button>
        <button onClick={() => onDelete(lead.id)} style={btnStyle('#fef2f2', '#dc2626')}>✕</button>
      </div>
    </div>
  );
}

const btnStyle = (bg, color) => ({
  padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer',
  fontSize: 11, fontWeight: 500, background: bg, color,
});

// ─── KANBAN COLUMN ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, leads, onEdit, onDelete, onConvert, onWhatsApp, draggingId, onDrop }) {
  const [over, setOver] = useState(false);
  const total = leads.reduce((s, l) => s + Number(l.value || 0), 0);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, stage.key); }}
      style={{
        minWidth: 220, flex: '0 0 220px',
        background: over ? '#f8faff' : '#f8fafc',
        border: `1.5px dashed ${over ? stage.color : '#e2e8f0'}`,
        borderRadius: 10, padding: 12,
        transition: 'all .15s',
      }}
    >
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{stage.label}</span>
          <span style={{
            background: stage.bg, color: stage.color, borderRadius: 20,
            padding: '1px 6px', fontSize: 11, fontWeight: 700,
          }}>{leads.length}</span>
        </div>
        {total > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>{fmt(total)}</span>}
      </div>

      {leads.map(lead => (
        <LeadCard
          key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete}
          onConvert={onConvert} onWhatsApp={onWhatsApp}
          isDragging={draggingId === lead.id}
        />
      ))}
      {leads.length === 0 && (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 12 }}>
          Arraste para cá
        </div>
      )}
    </div>
  );
}

// ─── FORM PANEL ───────────────────────────────────────────────────────────────

function LeadForm({ form, editing, saving, onChange, onSubmit, onCancel }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)',
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
        {editing ? 'Editar Lead' : 'Novo Lead'}
      </h3>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div><label className="form-label">Nome *</label>
            <input className="form-input" name="name" value={form.name} onChange={onChange} required placeholder="Nome completo" /></div>

          <div><label className="form-label">E-mail</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={onChange} placeholder="email@exemplo.com" /></div>

          <div><label className="form-label">Telefone / WhatsApp</label>
            <input
              className="form-input" name="phone" value={form.phone}
              onChange={e => onChange({ target: { name: 'phone', value: formatPhone(e.target.value) } })}
              placeholder="(00) 00000-0000"
            /></div>

          <div><label className="form-label">Origem</label>
            <select className="form-input" name="source" value={form.source} onChange={onChange}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>

          <div><label className="form-label">Tipo de evento</label>
            <select className="form-input" name="event_type" value={form.event_type} onChange={onChange}>
              <option value="">Selecionar...</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>

          <div>
            <label className="form-label">
              Data do evento
              {form.status === 'ganho' && form.event_date && (
                <span style={{ marginLeft: 6, fontSize: 10, color: '#16a34a', fontWeight: 700 }}>
                  ✓ Vinculada ao calendário
                </span>
              )}
            </label>
            <input className="form-input" type="date" name="event_date" value={form.event_date} onChange={onChange} /></div>

          <div><label className="form-label">Etapa</label>
            <select className="form-input" name="status" value={form.status} onChange={onChange}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Lead'}
          </button>
          {editing && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function BuffetLeads() {
  const [leads, setLeads]           = useState([]);
  const [pipeStats, setPipeStats]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingLead, setEditing]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [view, setView]             = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch]         = useState('');

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsData, pipeData] = await Promise.all([
        getLeads(),
        getLeadPipelineStats().catch(() => null),
      ]);
      setLeads(leadsData || []);
      setPipeStats(pipeData || {});
    } catch (err) {
      showToast('Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, value: 0 };
      let savedId = editingLead?.id;
      if (editingLead) {
        await updateLead(editingLead.id, payload);
      } else {
        const res = await createLead(payload);
        savedId = res?.data?.id || res?.id;
      }
      window.dispatchEvent(new CustomEvent('leads-updated'));
      reset();
      await loadData();
      // Se fechou o lead, oferecer criação de evento
      if (form.status === 'ganho') {
        setToast({
          message: `🎉 ${form.name} fechado!${form.event_date ? ' Data vinculada ao calendário.' : ' Adicione a data do evento.'}`,
          type: 'success',
          action: () => {
            const params = new URLSearchParams({
              from_lead: String(savedId || 'new'),
              client_name: form.name,
              event_type: form.event_type || '',
              event_date: (form.event_date || '').split('T')[0],
            });
            window.location.href = `/dashboard?module=buffet&tab=events&${params}`;
          },
          actionLabel: '→ Criar Evento',
        });
      } else {
        showToast(editingLead ? 'Lead atualizado' : 'Lead criado');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead) => {
    setEditing(lead);
    setForm({
      name: lead.name || '', email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'novo', source: lead.source || 'web',
      event_type: lead.event_type || '', event_date: lead.event_date?.split('T')[0] || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este lead?')) return;
    try {
      await deleteLead(id);
      showToast('Lead removido');
      if (editingLead?.id === id) reset();
      await loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao excluir', 'error');
    }
  };

  const handleConvert = (lead) => {
    const params = new URLSearchParams({
      from_lead: lead.id,
      client_name: lead.name,
      event_type: lead.event_type || '',
      event_date: lead.event_date || '',
      estimated_value: lead.value || '',
    });
    window.location.href = `/dashboard?module=buffet&tab=quotations&${params}`;
  };

  const handleWhatsApp = (lead) => {
    const raw = lead.phone.replace(/\D/g, '');
    const num = raw.startsWith('55') ? raw : `55${raw}`;
    window.open(`https://wa.me/${num}?text=Olá ${encodeURIComponent(lead.name)}, tudo bem?`, '_blank');
  };

  const handleDrop = async (e, targetStage) => {
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find(l => String(l.id) === String(leadId));
    if (!lead || lead.status === targetStage) return;
    try {
      await updateLead(leadId, { ...lead, status: targetStage });
      setLeads(prev => prev.map(l => String(l.id) === String(leadId) ? { ...l, status: targetStage } : l));
      if (targetStage === 'ganho') {
        setToast({
          message: `🎉 ${lead.name} fechado!${lead.event_date ? ' Data vinculada ao calendário.' : ' Adicione a data do evento.'}`,
          type: 'success',
          action: () => {
            const params = new URLSearchParams({
              from_lead: String(lead.id),
              client_name: lead.name,
              event_type: lead.event_type || '',
              event_date: (lead.event_date || '').split('T')[0],
            });
            window.location.href = `/dashboard?module=buffet&tab=events&${params}`;
          },
          actionLabel: '→ Criar Evento',
        });
      }
    } catch {
      showToast('Erro ao mover lead', 'error');
    }
    setDraggingId(null);
  };

  const reset = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(false); };

  const filtered = leads.filter(l =>
    !search || [l.name, l.email, l.company, l.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-buffet-wrap" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Leads</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Pipeline de oportunidades</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* view toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
            {[['kanban', '⠿ Kanban'], ['list', '☰ Lista']].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} style={{
                padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                background: view === k ? '#fff' : 'transparent',
                color: view === k ? '#0f172a' : '#64748b',
                boxShadow: view === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { if (showForm && !editingLead) { reset(); } else { reset(); setShowForm(true); } }}>
            {showForm && !editingLead ? '✕ Fechar' : '+ Novo Lead'}
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {/* Total */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '14px 20px', borderTop: '3px solid #6366f1',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total de Leads</p>
            <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
              {loading ? '—' : (pipeStats?.total_leads ?? leads.length)}
            </p>
          </div>
        </div>

        {/* Por status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {STAGES.map(stage => {
            const count = loading ? null : leads.filter(l => {
              if (stage.key === 'contactado') return l.status === 'contactado' || l.status === 'qualificado';
              return l.status === stage.key;
            }).length;
            return (
              <div key={stage.key} style={{
                background: stage.bg, border: `1px solid ${stage.color}22`,
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, color: stage.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stage.label}</p>
                </div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  {count === null ? '—' : count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <LeadForm
          form={form} editing={editingLead} saving={saving}
          onChange={handleChange} onSubmit={handleSubmit} onCancel={reset}
        />
      )}

      {/* ── SEARCH ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="form-input" style={{ maxWidth: 320, flex: 1 }}
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn" onClick={() => setSearch('')} style={{ whiteSpace: 'nowrap' }}>Limpar</button>
        )}
        <button className="btn" onClick={loadData} disabled={loading} style={{ marginLeft: 'auto' }}>
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        loading ? (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {STAGES.map(s => (
              <div key={s.key} style={{ minWidth: 220, height: 200, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }} className="skeleton" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key} stage={stage}
                leads={filtered.filter(l => {
                  // Backward compat: leads with 'qualificado' show under 'contactado'
                  if (stage.key === 'contactado') return l.status === 'contactado' || l.status === 'qualificado';
                  return l.status === stage.key;
                })}
                onEdit={handleEdit} onDelete={handleDelete}
                onConvert={handleConvert} onWhatsApp={handleWhatsApp}
                draggingId={draggingId} onDrop={handleDrop}
              />
            ))}
          </div>
        )
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
                {[200, 150, 120, 80, 60].map((w, j) => (
                  <div key={j} className="skeleton" style={{ height: 14, width: w, borderRadius: 6 }} />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Nenhum lead encontrado</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Nome', 'Contato', 'Evento', 'Valor', 'Etapa', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{lead.name}</p>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      <p style={{ margin: 0 }}>{lead.email || '—'}</p>
                      {lead.phone && (
                        <button onClick={() => handleWhatsApp(lead)} style={btnStyle('#dcfce7', '#15803d')}>
                          {lead.phone}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 13 }}>
                      {lead.event_type || '—'}
                      {lead.event_date && <span style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>{new Date(lead.event_date).toLocaleDateString('pt-BR')}</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {lead.value ? fmt(lead.value) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}><StageBadge stage={lead.status} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => handleEdit(lead)}>Editar</button>
                        <button onClick={() => handleConvert(lead)} style={{ ...btnStyle('#eff6ff', '#1d4ed8'), padding: '4px 8px', borderRadius: 4 }}>→ Orç</button>
                        <button className="btn btn-sm btn-icon danger" onClick={() => handleDelete(lead.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} action={toast.action} actionLabel={toast.actionLabel} />}
    </div>
  );
}
