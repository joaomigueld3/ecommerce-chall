import { request } from '@/lib/api-client';

function buildClientsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.fullName) params.set('fullName', filters.fullName);
  if (filters.contact) params.set('contact', filters.contact);
  if (filters.address) params.set('address', filters.address);
  if (filters.status !== undefined && filters.status !== '') params.set('status', String(filters.status));
  return params.toString();
}

export function getClients(token, filters) {
  const qs = filters ? buildClientsQuery(filters) : '';
  return request(qs ? `/clients?${qs}` : '/clients', { token });
}

export function getClientById(token, clientId) {
  return request(`/clients/${clientId}`, { token });
}

export function createClient(token, payload) {
  return request('/clients', { method: 'POST', body: payload, token });
}

export function updateClient(token, clientId, payload) {
  return request(`/clients/${clientId}`, { method: 'PUT', body: payload, token });
}

export function deleteClient(token, clientId) {
  return request(`/clients/${clientId}`, { method: 'DELETE', token });
}
