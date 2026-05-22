'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent, loading }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      border: '1px solid #e2e8f0',
      padding: '22px 24px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {label}
          </p>
          {loading ? (
            <div style={{ height: 36, width: '60%', borderRadius: 8, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          ) : (
            <div style={{ fontSize: 30, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>
              {value}
            </div>
          )}
          {sub && !loading && (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{sub}</p>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── QUICK ACTION ─────────────────────────────────────────────────────────────

function QuickAction({ label, icon, href, accent }) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 14,
      background: 'white', border: '1px solid #e2e8f0',
      textDecoration: 'none', transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = accent;
      e.currentTarget.style.background = `${accent}08`;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 6px 20px ${accent}20`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.background = 'white';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 16, color: '#94a3b8' }}>→</span>
    </a>
  );
}

// ─── ACTIVITY ROW ─────────────────────────────────────────────────────────────

function ActivityRow({ icon, title, subtitle, value, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0', borderBottom: '1px solid #f8fafc',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${accent}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div>}
      </div>
      {value && (
        <div style={{ fontSize: 14, fontWeight: 700, color: accent, flexShrink: 0 }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    quotations: 0,
    events: 0,
    revenue: 0,
    teamMembers: 0,
    approved: 0,
    pending: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMetrics(); }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [quotationsRes, eventsRes, billingRes, teamRes] = await Promise.all([
        apiRequest('/quotations').catch(() => []),
        apiRequest('/events').catch(() => []),
        apiRequest('/billing').catch(() => []),
        apiRequest('/team').catch(() => []),
      ]);

      const quotations = Array.isArray(quotationsRes?.data ?? quotationsRes) ? (quotationsRes?.data ?? quotationsRes) : [];
      const events     = Array.isArray(eventsRes?.data ?? eventsRes) ? (eventsRes?.data ?? eventsRes) : [];
      const billing    = Array.isArray(billingRes?.data ?? billingRes) ? (billingRes?.data ?? billingRes) : [];
      const team       = Array.isArray(teamRes?.data ?? teamRes) ? (teamRes?.data ?? teamRes) : [];

      const revenue = billing
        .filter(b => b.status === 'paid')
        .reduce((s, b) => s + Number(b.amount || 0), 0);

      const approved = quotations.filter(q => q.status === 'approved').length;
      const pending  = quotations.filter(q => q.status === 'draft').length;

      setMetrics({
        quotations: quotations.length,
        events: events.length,
        revenue,
        teamMembers: team.length,
        approved,
        pending,
      });

      setRecentQuotations(
        quotations
          .slice()
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 5)
      );
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = n =>
    Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const STATUS_LABELS = {
    draft:     'Rascunho',
    approved:  'Aprovado',
    active:    'Ativo',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  const STATUS_COLORS = {
    draft: '#64748b', approved: '#16a34a', active: '#2563eb',
    completed: '#7c3aed', cancelled: '#dc2626',
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Central Executiva</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 14 }}>
            Visão geral do negócio · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={loadMetrics} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px', borderRadius: 10, border: '1px solid #e2e8f0',
          background: 'white', color: '#64748b', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 14, display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
          Atualizar
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <KpiCard
          label="Receita Total"
          value={`R$ ${fmtCurrency(metrics.revenue)}`}
          sub="Pagamentos confirmados"
          icon="💰"
          accent="#2563eb"
          loading={loading}
        />
        <KpiCard
          label="Orçamentos"
          value={metrics.quotations}
          sub={`${metrics.approved} aprovados · ${metrics.pending} pendentes`}
          icon="📋"
          accent="#8b5cf6"
          loading={loading}
        />
        <KpiCard
          label="Eventos"
          value={metrics.events}
          sub="Total agendado"
          icon="📅"
          accent="#10b981"
          loading={loading}
        />
        <KpiCard
          label="Membros da Equipe"
          value={metrics.teamMembers}
          sub="Ativos no sistema"
          icon="👥"
          accent="#f59e0b"
          loading={loading}
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left: Recent quotations */}
        <div style={{
          background: 'white', borderRadius: 20, border: '1px solid #e2e8f0',
          overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Orçamentos Recentes</h3>
            </div>
            <a href="/dashboard?module=buffet&tab=quotations" style={{
              fontSize: 13, color: '#2563eb', fontWeight: 600, textDecoration: 'none',
            }}>
              Ver todos →
            </a>
          </div>

          <div style={{ padding: '8px 24px 16px' }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ height: 56, borderRadius: 10, margin: '8px 0', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))
            ) : recentQuotations.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>📋</div>
                <p style={{ margin: 0, fontSize: 14 }}>Nenhum orçamento criado ainda</p>
                <a href="/dashboard?module=buffet&tab=quotations" style={{
                  display: 'inline-block', marginTop: 12, fontSize: 13,
                  color: '#2563eb', fontWeight: 600, textDecoration: 'none',
                }}>
                  Criar primeiro orçamento →
                </a>
              </div>
            ) : (
              recentQuotations.map(q => (
                <ActivityRow
                  key={q.id}
                  icon="📄"
                  title={q.event_type || `Orçamento #${q.id}`}
                  subtitle={q.event_date ? `Data: ${new Date(q.event_date + 'T00:00').toLocaleDateString('pt-BR')}` : undefined}
                  value={q.total_amount ? `R$ ${fmtCurrency(q.total_amount)}` : undefined}
                  accent={STATUS_COLORS[q.status] || '#64748b'}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Quick actions + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Ações Rápidas */}
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid #e2e8f0',
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Ações Rápidas</h3>
            </div>
            <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction label="Novo Orçamento" icon="✦" href="/dashboard?module=buffet&tab=quotations" accent="#2563eb" />
              <QuickAction label="Ver Eventos" icon="📅" href="/dashboard?module=buffet&tab=events" accent="#10b981" />
              <QuickAction label="Financeiro" icon="💰" href="/dashboard?module=buffet&tab=billing" accent="#f59e0b" />
              <QuickAction label="Gerenciar Equipe" icon="👥" href="/dashboard?module=buffet&tab=team" accent="#8b5cf6" />
            </div>
          </div>

          {/* Status de Orçamentos */}
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid #e2e8f0',
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Pipeline</h3>
            </div>
            <div style={{ padding: '14px 20px 18px' }}>
              {loading ? (
                <div style={{ height: 80, borderRadius: 10, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'pending',  label: 'Rascunhos',  value: metrics.pending,   color: '#64748b' },
                    { key: 'approved', label: 'Aprovados',  value: metrics.approved,  color: '#16a34a' },
                  ].map(item => {
                    const pct = metrics.quotations > 0
                      ? Math.round((item.value / metrics.quotations) * 100)
                      : 0;
                    return (
                      <div key={item.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                        </div>
                        <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            background: item.color, width: `${pct}%`,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 8, padding: '12px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      Total de orçamentos
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                      {metrics.quotations}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
