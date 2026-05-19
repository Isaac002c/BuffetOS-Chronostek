import { apiRequest } from './api.js';

// ============================================
// EVENT TEMPLATES
// ============================================

export const getAllTemplates = async () => {
  const data = await apiRequest('/api/event-templates');
  return data.data;
};

export const getTemplate = async (id) => {
  const data = await apiRequest(`/api/event-templates/${id}`);
  return data.data;
};

export const createTemplate = async (templateData) => {
  const data = await apiRequest('/api/event-templates', {
    method: 'POST',
    body: templateData,
  });
  return data.data;
};

export const updateTemplate = async (id, templateData) => {
  const data = await apiRequest(`/api/event-templates/${id}`, {
    method: 'PUT',
    body: templateData,
  });
  return data.data;
};

export const deleteTemplate = async (id) => {
  const data = await apiRequest(`/api/event-templates/${id}`, {
    method: 'DELETE',
  });
  return data.data;
};

// ============================================
// TEMPLATE ITEMS
// ============================================

export const createTemplateItem = async (templateId, itemData) => {
  const data = await apiRequest(`/api/event-templates/${templateId}/items`, {
    method: 'POST',
    body: itemData,
  });
  return data.data;
};

export const updateTemplateItem = async (itemId, itemData) => {
  const data = await apiRequest(`/api/event-templates/items/${itemId}`, {
    method: 'PUT',
    body: itemData,
  });
  return data.data;
};

export const deleteTemplateItem = async (itemId) => {
  const data = await apiRequest(`/api/event-templates/items/${itemId}`, {
    method: 'DELETE',
  });
  return data.data;
};

// ============================================
// QUOTATION SIMULATION
// ============================================

export const simulateQuotation = async (simulationData) => {
  const data = await apiRequest('/api/quotations/simulate', {
    method: 'POST',
    body: simulationData,
  });
  return data.data;
};

// ============================================
// GENERATE PROPOSAL PDF
// ============================================

export const generateProposal = async (quotationId, proposalData = {}) => {
  const data = await apiRequest(`/api/quotations/${quotationId}/generate-proposal`, {
    method: 'POST',
    body: proposalData,
  });
  return data.data;
};
