'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { getDashboardStats, getMonthlySummary, getConversionMetrics, getRevenueByMonth, getEventTypeBreakdown, getSalesByClient, getRevenueForecast, getRevenueComparison } from '../lib/billingAPI.js';
import TooltipComponent from '../components/Tooltip.jsx';

// Lazy load chart components for better performance
const LazyLineChart = lazy(() => import('./charts/RevenueChart.jsx'));

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CHART_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];

const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2)}`;

const buildMonthData = (month, value) => ({ month: MONTH_NAMES[month - 1] ?? `Mês ${month}`, value });

const fallbackRevenue = MONTH_NAMES.map((month) => ({ month, revenue: 0 }));
const fallbackBreakdown = MONTH_NAMES.slice(0, 4).map((label) => ({ name: label, value: 0 }));
const fallbackClients = [{ name: 'Sem dados', sales: 0 }];

export default function BuffetBilling() {
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [salesByClient, setSalesByClient] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, monthlyData, conversionData, breakdownData, salesData, forecastData, comparisonData] = await Promise.all([
        getDashboardStats(),
        getRevenueByMonth(new Date().getFullYear()),
        getConversionMetrics().catch(() => null),
        getEventTypeBreakdown().catch(() => []),
        getSalesByClient(new Date().getFullYear()).catch(() => []),
        getRevenueForecast(6).catch(() => null),
        getRevenueComparison(new Date().getFullYear()).catch(() => null),
      ]);
      setStats(dashboardData || {});
      setRevenue(monthlyData || []);
      setConversion(conversionData || {});
      setBreakdown(breakdownData || []);
      setSalesByClient(salesData || []);
      setForecast(forecastData || null);
      setComparison(comparisonData || null);
      setSummary(await getMonthlySummary(new Date().getMonth() + 1, new Date().getFullYear()).catch(() => null));
    } catch (err) {
      console.error('Erro ao carregar faturamento:', err);
      setError({
        title: 'Erro ao carregar dados',
        message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        details: err.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const revenueChartData = useMemo(() => {
    if (revenue.length === 0) return fallbackRevenue;

    const mapped = revenue.map((entry) => buildMonthData(Number(entry.month || 0), Number(entry.total_amount || 0)));
    return MONTH_NAMES.map((label) => {
      const row = mapped.find((item) => item.month === label);
      return { month: label, revenue: row ? row.value : 0 };
    });
  }, [revenue]);

  const eventChartData = useMemo(() => {
    if (breakdown.length === 0) return fallbackBreakdown;
    return breakdown.map((item, index) => ({
      name: item.event_type || item.type || `Tipo ${index + 1}`,
      value: Number(item.count || 0),
    }));
  }, [breakdown]);

  const clientChartData = useMemo(() => {
    if (salesByClient.length === 0) return fallbackClients;
    return salesByClient.slice(0, 5).map((client) => ({
      name: client.client_name || 'Sem nome',
      sales: Number(client.total_sales || 0),
    }));
  }, [salesByClient]);

  const forecastChartData = useMemo(() => {
    if (!forecast?.months?.length) return fallbackRevenue;
    return forecast.months.map((entry) => ({
      month: `${entry.month.toString().padStart(2, '0')}/${entry.year}`,
      value: Number(entry.amount || 0),
    }));
  }, [forecast]);

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Faturamento Buffet</h2>
        <TooltipComponent content="Atualizar dados de faturamento">
          <button onClick={loadBilling} className="btn-small" disabled={loading}>
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar'}
          </button>
        </TooltipComponent>
      </div>

      {message && <div className="notice-message">{message}</div>}

      {error && (
        <div className="loading-error">
          <div className="icon">⚠️</div>
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <button className="retry-button" onClick={loadBilling}>
            🔄 Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-grid">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="loading-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-item">
              <strong>💰 Receita total</strong>
              <span>{formatCurrency(stats.total_revenue_all)}</span>
            </div>
            <div className="summary-item">
              <strong>📅 Receita do mês</strong>
              <span>{formatCurrency(stats.total_revenue_month)}</span>
            </div>
            <div className="summary-item">
              <strong>📈 Pipeline de propostas</strong>
              <span>{formatCurrency(stats.pipeline_value)}</span>
            </div>
            <div className="summary-item">
              <strong>🎯 Conversão</strong>
              <span>{conversion ? `${conversion.conversion_rate ?? '—'}%` : '—'}</span>
            </div>
          </div>

          {summary && (
            <div className="section-block">
              <h3>Resumo Mensal</h3>
              <p><strong>Faturamento:</strong> {formatCurrency(summary.monthly_revenue)}</p>
              <p><strong>Eventos confirmados:</strong> {summary.events_count ?? '—'}</p>
              <p><strong>Cotações criadas:</strong> {summary.quotes_created ?? '—'}</p>
              <p><strong>Cotações aprovadas:</strong> {summary.approved_quotes ?? '—'}</p>
            </div>
          )}

          <div className="dashboard-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Receita do ano</h3>
              </div>
              <div className="chart-area">
                {revenue.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>Nenhum dado de receita disponível</p>
                  </div>
                ) : (
                  <Suspense fallback={<div className="chart-loading">Carregando gráfico...</div>}>
                    <LazyLineChart data={revenueChartData} />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Breakdown de eventos</h3>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={eventChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label line={false}>
                      {eventChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} eventos`, 'Eventos']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card full-width">
              <div className="chart-card-header">
                <h3>Previsão de receita</h3>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" tickFormatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card full-width">
              <div className="chart-card-header">
                <h3>Top clientes</h3>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={clientChartData} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                    <YAxis dataKey="name" type="category" width={140} stroke="#6B7280" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="sales" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="section-block">
            <h3>Comparativo de receita</h3>
            {!comparison ? (
              <p>Comparativo de ano não disponível.</p>
            ) : (
              <>
                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>{comparison.year} receita:</strong>
                    <span>{formatCurrency(comparison.totalCurrent)}</span>
                  </div>
                  <div className="summary-item">
                    <strong>{comparison.previousYear} receita:</strong>
                    <span>{formatCurrency(comparison.totalPrevious)}</span>
                  </div>
                  <div className="summary-item">
                    <strong>Crescimento anual:</strong>
                    <span>{comparison.growth === null ? 'N/A' : `${comparison.growth}%`}</span>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>{comparison.previousYear}</th>
                        <th>{comparison.year}</th>
                        <th>Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.months.map((entry) => (
                        <tr key={entry.month}>
                          <td>{entry.month.toString().padStart(2, '0')}</td>
                          <td>{formatCurrency(entry.previous_year_amount)}</td>
                          <td>{formatCurrency(entry.current_year_amount)}</td>
                          <td>{formatCurrency(entry.current_year_amount - entry.previous_year_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
