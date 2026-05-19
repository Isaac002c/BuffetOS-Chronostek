import { apiRequest } from './api.js';

export const getAllQuotations = async () => {
  const data = await apiRequest('/api/quotations');
  return data.data;
};

export const getQuotationsByClient = async (clientId) => {
  const data = await apiRequest(`/api/quotations/client/${clientId}`);
  return data.data;
};

export const getQuotation = async (id) => {
  const data = await apiRequest(`/api/quotations/${id}`);
  return data.data;
};

export const createQuotation = async (quotationData) => {
  const data = await apiRequest('/api/quotations', {
    method: 'POST',
    body: quotationData,
  });
  return data.data;
};

export const updateQuotation = async (id, quotationData) => {
  const data = await apiRequest(`/api/quotations/${id}`, {
    method: 'PUT',
    body: quotationData,
  });
  return data.data;
};

export const deleteQuotation = async (id) => {
  const data = await apiRequest(`/api/quotations/${id}`, {
    method: 'DELETE',
  });
  return data.data;
};

export const approveQuotation = async (id) => {
  const data = await apiRequest(`/api/quotations/${id}/approve`, {
    method: 'POST',
  });
  return data.data;
};

export const cancelQuotation = async (id) => {
  const data = await apiRequest(`/api/quotations/${id}/cancel`, {
    method: 'POST',
  });
  return data.data;
};

export const duplicateQuotation = async (id, clientId) => {
  const data = await apiRequest(`/api/quotations/${id}/duplicate`, {
    method: 'POST',
    body: { clientId },
  });
  return data.data;
};
