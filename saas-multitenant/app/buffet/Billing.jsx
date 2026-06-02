'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  getDashboardStats, getConversionMetrics,
  getRevenueByMonth, getEventTypeBreakdown,
  getRevenueForecast, getRevenueComparison,
  getMonthlySummary,
} from '../lib/billingAPI.js';
import { getTeam } from '../lib/teamAPI.js';
import { getLeads } from '../lib/leadsAPI.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MONTH_NAMES   = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CHART_COLORS  = ['#6366f1', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];
const SOURCE_LABELS = { web: 'Web', indicação: 'Indicação', parceiro: 'Parceiro', instagram: 'Instagram', outro: 'Outro' };

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fallbackRevenue   = MONTH_NAMES.map(m => ({ month: m, revenue: 0 }));
const fallbackBreakdown = MONTH_NAMES.slice(0, 4).map(l => ({ name: l, value: 0 }));

// ─── SKELETON CHART ───────────────────────────────────────────────────────────

function ChartSkeleton({ height = 240 }) {
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
      {/* Y-axis stub */}
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 8 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ width: 40, height: 10, borderRadius: 4 }} />)}
        </div>
        {/* Bars */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {MONTH_NAMES.map(m => (
            <div key={m} className="skeleton" style={{
              flex: 1, borderRadius: '4px 4px 0 0',
              height: `${30 + Math.random() * 60}%`,
            }} />
          ))}
        </div>
      </div>
      {/* X-axis stub */}
      <div style={{ display: 'flex', gap: 6, paddingLeft: 48 }}>
        {MONTH_NAMES.map(m => <div key={m} className="skeleton" style={{ flex: 1, height: 8, borderRadius: 4 }} />)}
      </div>
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent, note, loading }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '14px 16px', borderTop: `3px solid ${accent}`,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 500 }}>{label}</p>
      {loading
        ? <div className="skeleton" style={{ height: 20, width: 100, borderRadius: 4, marginTop: 6 }} />
        : <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{value}</p>
      }
      {note && !loading && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{note}</p>}
    </div>
  );
}

// ─── CHART CARD ───────────────────────────────────────────────────────────────

function ChartCard({ title, note, loading, children, fullWidth }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
      gridColumn: fullWidth ? 'span 2' : undefined,
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{title}</h3>
          {note && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{note}</p>}
        </div>
      </div>
      <div style={{ padding: '8px 16px 16px' }}>
        {loading ? <ChartSkeleton /> : children}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function BuffetBilling() {
  const [stats, setStats]           = useState({});
  const [conversion, setConversion] = useState(null);
  const [revenue, setRevenue]       = useState([]);
  const [breakdown, setBreakdown]   = useState([]);
  const [forecast, setForecast]     = useState(null);
  const [comparison, setComparison] = useState(null);
  const [summary, setSummary]         = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [error, setError]           = useState(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setChartsReady(false);
    setError(null);
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const [
        dashData, monthData, convData, bkData,
        forecastData, compData, teamData, leadsData, summaryData,
      ] = await Promise.all([
        getDashboardStats(),
        getRevenueByMonth(year),
        getConversionMetrics().catch(() => null),
        getEventTypeBreakdown().catch(() => []),
        getRevenueForecast(6).catch(() => null),
        getRevenueComparison(year).catch(() => null),
        getTeam().catch(() => []),
        getLeads().catch(() => []),
        getMonthlySummary(month, year).catch(() => null),
      ]);

      setStats(dashData || {});
      setRevenue(monthData || []);
      setConversion(convData || {});
      setBreakdown(bkData || []);
      setForecast(forecastData || null);
      setComparison(compData || null);
      setTeamMembers(teamData || []);
      setLeads(leadsData || []);
      setSummary(summaryData || null);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
      // slight delay so recharts gets proper container width
      setTimeout(() => setChartsReady(true), 80);
    }
  }, []);

  useEffect(() => { loadBilling(); }, [loadBilling]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const revenueChartData = useMemo(() => {
    if (!revenue.length) return fallbackRevenue;
    return MONTH_NAMES.map((label, i) => {
      const entry = revenue.find(e => Number(e.month) === i + 1);
      return { month: label, revenue: Number(entry?.total_amount || 0) };
    });
  }, [revenue]);

  // Eventos fechados (aprovados/confirmados) por tipo — vem do breakdown do backend
  const closedEventChartData = useMemo(() => {
    if (!breakdown.length) return fallbackBreakdown;
    return breakdown.map((item, i) => ({
      name: item.event_type || item.type || `Tipo ${i + 1}`,
      value: Number(item.count || 0),
    }));
  }, [breakdown]);

  // Demanda de eventos por tipo — leads abertos (exceto ganho/perdido)
  const pendingEventChartData = useMemo(() => {
    const map = {};
    leads
      .filter(l => l.event_type && !['ganho', 'perdido'].includes(l.status))
      .forEach(l => {
        const tipo = l.event_type;
        if (!map[tipo]) map[tipo] = { tipo, count: 0 };
        map[tipo].count++;
      });
    const data = Object.values(map).sort((a, b) => b.count - a.count);
    return data.length ? data : [{ tipo: 'Sem dados', count: 0 }];
  }, [leads]);

  const forecastChartData = useMemo(() => {
    if (!forecast?.months?.length) return fallbackRevenue;
    return forecast.months.map(e => ({
      month: `${String(e.month).padStart(2, '0')}/${e.year}`,
      value: Number(e.amount || 0),
    }));
  }, [forecast]);

  // Lead source breakdown — sempre mostra mesmo com dados zerados
  const sourceChartData = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      const src = l.source || 'outro';
      if (!map[src]) map[src] = { source: SOURCE_LABELS[src] || src, count: 0, value: 0 };
      map[src].count++;
      map[src].value += Number(l.value || 0);
    });
    const data = Object.values(map).sort((a, b) => b.count - a.count);
    // Fallback mínimo para não esconder o gráfico
    return data.length ? data : Object.entries(SOURCE_LABELS).map(([, label]) => ({ source: label, count: 0, value: 0 }));
  }, [leads]);

  // Team cost summary
  const teamCost = useMemo(() => {
    const active = teamMembers.filter(m => (m.status || 'ativo') === 'ativo' && m.custo_diaria);
    const totalDaily = active.reduce((s, m) => s + Number(m.custo_diaria), 0);
    return { active: active.length, totalDaily, monthly: totalDaily * 4 };
  }, [teamMembers]);

  const totalRevenue   = Number(stats.total_revenue_month || 0);
  const netResult      = totalRevenue - teamCost.monthly;
  const convRate       = conversion?.conversion_rate ?? null;

  if (error) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <p style={{ fontWeight: 600, color: '#0f172a' }}>Erro ao carregar dados</p>
      <p style={{ color: '#64748b', fontSize: 14 }}>{error}</p>
      <button className="btn btn-primary" onClick={loadBilling} style={{ marginTop: 12 }}>Tentar novamente</button>
    </div>
  );

  return (
    <div className="billing-page-wrap" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Financeiro</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Receitas, custos e tendências de faturamento</p>
        </div>
        <button className="btn" onClick={loadBilling} disabled={loading}>
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="billing-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Receita do mês"       value={fmt(stats.total_revenue_month)}  accent="#16a34a" loading={loading} />
        <KpiCard label="Receita total"         value={fmt(stats.total_revenue_all)}    accent="#6366f1" loading={loading} />
        <KpiCard label="Pipeline orçamentos"   value={fmt(stats.pipeline_value)}       accent="#0ea5e9" loading={loading} />
        <KpiCard label="Taxa de conversão"     value={convRate !== null ? `${convRate}%` : '—'} accent="#d97706" loading={loading} />
      </div>

      {/* ── CHARTS GRID ── */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Revenue line */}
        <ChartCard title="Receita mensal" note={new Date().getFullYear()} loading={!chartsReady} fullWidth>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [fmt(v), 'Receita']} />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead source — todos os leads por canal */}
        <ChartCard title="Origem dos leads" note="todos os leads (abertos e fechados)" loading={!chartsReady}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="source" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} leads`, 'Qtd']} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Eventos fechados por tipo */}
        <ChartCard title="Eventos fechados" note="por tipo de evento (aprovados/confirmados)" loading={!chartsReady}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={closedEventChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {closedEventChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [`${v} evento${v !== 1 ? 's' : ''}`, 'Qtd']} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Maior procura — leads ativos por tipo */}
        <ChartCard title="Maior procura (leads ativos)" note="tipo de evento mais buscado em leads abertos" loading={!chartsReady}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pendingEventChartData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="tipo" type="category" width={110} stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${v} lead${v !== 1 ? 's' : ''}`, 'Interesse']} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {pendingEventChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Forecast */}
        <ChartCard title="Previsão de receita" note="próximos 6 meses" loading={!chartsReady} fullWidth>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [fmt(v), 'Previsão']} />
              <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── TEAM COST TABLE ── */}
      {!loading && teamMembers.filter(m => m.custo_diaria).length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Custo operacional — Equipe</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Colaboradores com diária cadastrada</p>
          </div>
          <div className="table-scroll-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Colaborador', 'Função', 'Status', 'Diária', 'Est. mensal (×4)'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.filter(m => m.custo_diaria).map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.nome}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.funcao}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      color: m.status === 'ativo' || !m.status ? '#16a34a' : '#94a3b8',
                      background: m.status === 'ativo' || !m.status ? '#f0fdf4' : '#f8fafc',
                    }}>{m.status || 'ativo'}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{fmt(m.custo_diaria)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(Number(m.custo_diaria) * 4)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>Total estimado</td>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmt(teamCost.totalDaily)}/dia</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626' }}>{fmt(teamCost.monthly)}/mês</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── ANNUAL COMPARISON ── */}
      {!loading && comparison && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{comparison.previousYear}</p>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 16 }}>{fmt(comparison.totalPrevious)}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{comparison.year}</p>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 16 }}>{fmt(comparison.totalCurrent)}</p>
            </div>
            {comparison.growth !== null && (
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Crescimento</p>
                <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 16, color: comparison.growth >= 0 ? '#16a34a' : '#dc2626' }}>
                  {comparison.growth >= 0 ? '▲' : '▼'} {Math.abs(comparison.growth)}%
                </p>
              </div>
            )}
          </div>
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Mês', comparison.previousYear, comparison.year, 'Variação'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.months?.map(e => {
                  const diff = Number(e.current_year_amount) - Number(e.previous_year_amount);
                  return (
                    <tr key={e.month} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px' }}>{MONTH_NAMES[Number(e.month) - 1] || e.month}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{fmt(e.previous_year_amount)}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 500 }}>{fmt(e.current_year_amount)}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: diff >= 0 ? '#16a34a' : '#dc2626' }}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY SUMMARY ── */}
      {!loading && summary && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Resumo do mês atual</h3>
          <div className="billing-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Faturamento',        value: fmt(summary.monthly_revenue) },
              { label: 'Eventos confirmados',value: summary.events_count ?? '—' },
              { label: 'Orçamentos criados', value: summary.quotes_created ?? '—' },
              { label: 'Orçamentos aprovados',value: summary.approved_quotes ?? '—' },
            ].map(k => (
              <div key={k.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{k.label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
