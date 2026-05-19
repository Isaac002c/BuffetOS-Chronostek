import { apiRequest } from './api.js';

export const getAllEvents = async () => {
  const data = await apiRequest('/api/events');
  return data.data;
};

export const getUpcomingEvents = async () => {
  const data = await apiRequest('/api/events/upcoming');
  return data.data;
};

export const getEventsByPeriod = async (startDate, endDate) => {
  const data = await apiRequest(`/api/events/period/${startDate}/${endDate}`);
  return data.data;
};

export const getEvent = async (id) => {
  const data = await apiRequest(`/api/events/${id}`);
  return data.data;
};

export const createEvent = async (eventData) => {
  const data = await apiRequest('/api/events', {
    method: 'POST',
    body: eventData,
  });
  return data.data;
};

export const updateEvent = async (id, eventData) => {
  const data = await apiRequest(`/api/events/${id}`, {
    method: 'PUT',
    body: eventData,
  });
  return data.data;
};

export const deleteEvent = async (id) => {
  const data = await apiRequest(`/api/events/${id}`, {
    method: 'DELETE',
  });
  return data.data;
};

export const checkEventConflict = async (date) => {
  const data = await apiRequest(`/api/events/check-conflict/${date}`);
  return data.data;
};

export const getEventStats = async () => {
  const data = await apiRequest('/api/events/stats/overview');
  return data.data;
};
