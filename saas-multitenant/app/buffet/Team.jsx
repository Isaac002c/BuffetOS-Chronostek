'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTeam, createMember, updateMember, deleteMember } from '../lib/teamAPI';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const FUNCOES = ['Garcom', 'Cozinha', 'Churrasqueiro', 'Confeitaria', 'Bartender', 'Gerente', 'Outro'];

const STATUS_CFG = {
  ativo:    { label: 'Ativo',    color: '#16a34a', bg: '#f0fdf4' },
  inativo:  { label: 'Inativo',  color: '#dc2626', bg: '#fef2f2' },
  ferias:   { label: 'Férias',   color: '#d97706', bg: '#fffbeb' },
};

const EMPTY_FORM = {
  nome: '', cpf: '', rg: '', email: '', chave_pix: '',
  funcao: 'Garcom', custo_diaria: '', disponibilidade: '',
  status: 'ativo', observacoes: '',
};

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#fff', border: `1px solid ${colors[type] || colors.info}`,
      borderLeft: `4px solid ${colors[type] || colors.info}`,
      borderRadius: 8, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 260, maxWidth: 360,
      animation: 'slideInRight .25s ease',
    }}>
      <span style={{ fontSize: 16 }}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16 }}>×</button>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ativo;
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

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 100px 80px',
      gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center',
    }}>
      {[160, 110, 140, 90, 60, 80].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: w, borderRadius: 6 }} />
      ))}
    </div>
  );
}

// ─── MEMBER CARD (mobile) ────────────────────────────────────────────────────

function MemberCard({ member, onEdit, onDelete }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{member.nome}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{member.funcao}</p>
        </div>
        <StatusBadge status={member.status || 'ativo'} />
      </div>
      {member.email && <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{member.email}</p>}
      {member.custo_diaria && (
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Diária: <strong style={{ color: '#0f172a' }}>
            {Number(member.custo_diaria).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-sm" onClick={() => onEdit(member)}>Editar</button>
        <button className="btn btn-sm btn-icon danger" onClick={() => onDelete(member.id)}>Remover</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Team() {
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [toast, setToast]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await getTeam());
    } catch {
      showToast('Erro ao carregar equipe', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.custo_diaria) delete payload.custo_diaria;
      if (editingId) {
        await updateMember(editingId, payload);
        showToast('Membro atualizado com sucesso');
      } else {
        await createMember(payload);
        showToast('Membro adicionado com sucesso');
      }
      reset();
      await loadTeam();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar membro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m) => {
    setForm({
      nome: m.nome || '', cpf: m.cpf || '', rg: m.rg || '',
      email: m.email || '', chave_pix: m.chave_pix || '',
      funcao: m.funcao || 'Garcom',
      custo_diaria: m.custo_diaria ?? '',
      disponibilidade: m.disponibilidade || '',
      status: m.status || 'ativo',
      observacoes: m.observacoes || '',
    });
    setEditingId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este membro da equipe?')) return;
    try {
      await deleteMember(id);
      showToast('Membro removido');
      await loadTeam();
    } catch (err) {
      showToast(err.message || 'Erro ao remover membro', 'error');
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const filtered = filterStatus === 'all'
    ? team
    : team.filter(m => (m.status || 'ativo') === filterStatus);

  const stats = {
    total:   team.length,
    ativos:  team.filter(m => (m.status || 'ativo') === 'ativo').length,
    inativos: team.filter(m => m.status === 'inativo').length,
    totalDiaria: team
      .filter(m => m.custo_diaria && (m.status || 'ativo') === 'ativo')
      .reduce((s, m) => s + Number(m.custo_diaria), 0),
  };

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-buffet-wrap" style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Equipe</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Gerencie colaboradores, funções e disponibilidade</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { if (showForm && !editingId) { reset(); } else { reset(); setShowForm(true); } }}
        >
          {showForm && !editingId ? '✕ Cancelar' : '+ Novo Membro'}
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',   value: stats.total,    accent: '#6366f1' },
          { label: 'Ativos',  value: stats.ativos,   accent: '#16a34a' },
          { label: 'Inativos',value: stats.inativos, accent: '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '14px 16px', borderTop: `3px solid ${k.accent}`,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{k.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)',
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            {editingId ? 'Editar Membro' : 'Novo Membro da Equipe'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>

              <div><label className="form-label">Nome *</label>
                <input className="form-input" name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo" /></div>

              <div><label className="form-label">CPF *</label>
                <input className="form-input" name="cpf" value={form.cpf} onChange={handleChange} required placeholder="000.000.000-00" /></div>

              <div><label className="form-label">RG</label>
                <input className="form-input" name="rg" value={form.rg} onChange={handleChange} placeholder="RG" /></div>

              <div><label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@exemplo.com" /></div>

              <div><label className="form-label">Chave PIX</label>
                <input className="form-input" name="chave_pix" value={form.chave_pix} onChange={handleChange} placeholder="CPF, e-mail ou telefone" /></div>

              <div><label className="form-label">Função *</label>
                <select className="form-input" name="funcao" value={form.funcao} onChange={handleChange}>
                  {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                </select></div>

              <div><label className="form-label">Status</label>
                <select className="form-input" name="status" value={form.status} onChange={handleChange}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>

              <div><label className="form-label">Disponibilidade</label>
                <input className="form-input" name="disponibilidade" value={form.disponibilidade} onChange={handleChange} placeholder="Ex: fins de semana" /></div>

              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Observações</label>
                <textarea className="form-input" name="observacoes" value={form.observacoes} onChange={handleChange}
                  rows={2} placeholder="Notas internas sobre este colaborador"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" className="btn" onClick={reset}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos'], ['ferias', 'Férias']].map(([k, l]) => (
          <button key={k} onClick={() => setFilterStatus(k)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: filterStatus === k ? '#0f172a' : '#f1f5f9',
            color: filterStatus === k ? '#fff' : '#475569',
            transition: 'all .15s',
          }}>{l}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>
          {filtered.length} {filtered.length === 1 ? 'membro' : 'membros'}
        </span>
      </div>

      {/* ── TABLE ── */}
      {loading ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Nenhum membro encontrado</p>
          <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: 14 }}>
            {filterStatus !== 'all' ? 'Tente outro filtro.' : 'Adicione o primeiro colaborador.'}
          </p>
          {filterStatus === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Novo Membro</button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'block' }}
               className="team-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Nome / Função', 'Email', 'CPF', 'Diária', 'Disponibilidade', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{m.nome}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{m.funcao}</p>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{m.email || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 13 }}>{m.cpf || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 500 }}>
                      {m.custo_diaria ? fmt(m.custo_diaria) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{m.disponibilidade || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={m.status || 'ativo'} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => handleEdit(m)}>Editar</button>
                        <button className="btn btn-sm btn-icon danger" onClick={() => handleDelete(m.id)}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div style={{ display: 'none' }} className="team-cards-wrap">
            {filtered.map(m => (
              <MemberCard key={m.id} member={m} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
