import { apiRequest } from './api.js';

export const getLeads = async () => {
  const data = await apiRequest('/api/leads');
  return data.data;
};

export const getLead = async (id) => {
  const data = await apiRequest(`/api/leads/${id}`);
  return data.data;
};

export const createLead = async (leadData) => {
  const data = await apiRequest('/api/leads', {
    method: 'POST',
    body: leadData,
  });
  return data.data;
};

export const updateLead = async (id, leadData) => {
  const data = await apiRequest(`/api/leads/${id}`, {
    method: 'PUT',
    body: leadData,
  });
  return data.data;
};

export const deleteLead = async (id) => {
  const data = await apiRequest(`/api/leads/${id}`, {
    method: 'DELETE',
  });
  return data.data;
};

export const getLeadPipelineStats = async () => {
  const data = await apiRequest('/api/leads/stats/pipeline');
  return data.data;
};

export const getLeadStatusStats = async () => {
  const data = await apiRequest('/api/leads/stats/status');
  return data.data;
};

export const getLeadSourceStats = async () => {
  const data = await apiRequest('/api/leads/stats/source');
  return data.data;
};

export const getLeadMonthlyMetrics = async (months = 6) => {
  const data = await apiRequest(`/api/leads/stats/monthly?months=${months}`);
  return data.data;
};

export const getInactiveLeads = async (days = 7) => {
  const data = await apiRequest(`/api/leads/inactive/${days}`);
  return data.data;
};
