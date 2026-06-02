import { apiRequest } from './api';

const BASE = '/api/team';

export const getTeam        = ()       => apiRequest(BASE).then(d => d?.data || d || []);
export const getMember      = (id)     => apiRequest(`${BASE}/${id}`).then(d => d?.data || d);
export const createMember   = (body)   => apiRequest(BASE, { method: 'POST', body });
export const updateMember   = (id, b)  => apiRequest(`${BASE}/${id}`, { method: 'PUT', body: b });
export const deleteMember   = (id)     => apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
