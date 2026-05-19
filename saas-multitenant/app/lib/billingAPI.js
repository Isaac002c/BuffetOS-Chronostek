import { apiRequest } from './api.js';

export const getDashboardStats = async (month = null, year = null) => {
  const query = [];
  if (month !== null) query.push(`month=${month}`);
  if (year !== null) query.push(`year=${year}`);
  const suffix = query.length ? `?${query.join('&')}` : '';
  const data = await apiRequest(`/api/billing/stats${suffix}`);
  return data.data;
};

export const getRevenueByMonth = async (year = null) => {
  const suffix = year ? `?year=${year}` : '';
  const data = await apiRequest(`/api/billing/revenue/monthly${suffix}`);
  return data.data;
};

export const getLeadPipelineValue = async () => {
  const data = await apiRequest('/api/billing/pipeline/value');
  return data.data;
};

export const getEventTypeBreakdown = async () => {
  const data = await apiRequest('/api/billing/events/breakdown');
  return data.data;
};

export const getMonthlySummary = async (month, year) => {
  const data = await apiRequest(`/api/billing/summary/${month}/${year}`);
  return data.data;
};

export const getConversionMetrics = async () => {
  const data = await apiRequest('/api/billing/metrics/conversion');
  return data.data;
};

export const getSalesByClient = async (year = null) => {
  const suffix = year ? `?year=${year}` : '';
  const data = await apiRequest(`/api/billing/sales/clients${suffix}`);
  return data.data;
};

export const getRevenueComparison = async (year = null) => {
  const suffix = year ? `?year=${year}` : '';
  const data = await apiRequest(`/api/billing/revenue/comparison${suffix}`);
  return data.data;
};

export const getRevenueForecast = async (months = 6) => {
  const suffix = months ? `?months=${months}` : '';
  const data = await apiRequest(`/api/billing/revenue/forecast${suffix}`);
  return data.data;
};
