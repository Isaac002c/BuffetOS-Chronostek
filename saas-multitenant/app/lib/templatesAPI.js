import { apiRequest } from './api.js';

export const getTemplates = async () => {
  const data = await apiRequest('/api/event-templates');
  return data?.data || [];
};

export const getTemplate = async (id) => {
  const data = await apiRequest(`/api/event-templates/${id}`);
  return data?.data;
};

export const createTemplate = async (payload) => {
  const data = await apiRequest('/api/event-templates', { method: 'POST', body: payload });
  return data?.data;
};

export const updateTemplate = async (id, payload) => {
  const data = await apiRequest(`/api/event-templates/${id}`, { method: 'PUT', body: payload });
  return data?.data;
};

export const deleteTemplate = async (id) => {
  return apiRequest(`/api/event-templates/${id}`, { method: 'DELETE' });
};

export const addTemplateItem = async (templateId, payload) => {
  const data = await apiRequest(`/api/event-templates/${templateId}/items`, { method: 'POST', body: payload });
  return data?.data;
};

export const updateTemplateItem = async (itemId, payload) => {
  const data = await apiRequest(`/api/event-templates/items/${itemId}`, { method: 'PUT', body: payload });
  return data?.data;
};

export const deleteTemplateItem = async (itemId) => {
  return apiRequest(`/api/event-templates/items/${itemId}`, { method: 'DELETE' });
};
