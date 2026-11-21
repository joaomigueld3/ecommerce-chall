import { request } from '@/lib/api-client';

function buildClientsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.fullName) params.set('fullName', filters.fullName);
  if (filters.contact) params.set('contact', filters.contact);
  if (filters.address) params.set('address', filters.address);
  if (filters.country) params.set('country', filters.country);
  if (filters.tier) params.set('tier', filters.tier);
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

export function getClientOverview(token, clientId) {
  return request(`/clients/${clientId}/overview`, { token });
}

export function updateClientCrm(token, clientId, payload) {
  return request(`/clients/${clientId}/crm`, { method: 'PATCH', body: payload, token });
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

export function getClientAddresses(token, clientId) {
  return request(`/clients/${clientId}/addresses`, { token });
}

export function createClientAddress(token, clientId, payload) {
  return request(`/clients/${clientId}/addresses`, { method: 'POST', body: payload, token });
}

export function updateClientAddress(token, clientId, addressId, payload) {
  return request(`/clients/${clientId}/addresses/${addressId}`, { method: 'PUT', body: payload, token });
}

export function deleteClientAddress(token, clientId, addressId) {
  return request(`/clients/${clientId}/addresses/${addressId}`, { method: 'DELETE', token });
}

export function getClientPaymentMethods(token, clientId) {
  return request(`/clients/${clientId}/payment-methods`, { token });
}

export function createClientPaymentMethod(token, clientId, payload) {
  return request(`/clients/${clientId}/payment-methods`, { method: 'POST', body: payload, token });
}

export function setDefaultClientPaymentMethod(token, clientId, paymentMethodId) {
  return request(`/clients/${clientId}/payment-methods/${paymentMethodId}/default`, {
    method: 'PATCH',
    token,
  });
}

export function deleteClientPaymentMethod(token, clientId, paymentMethodId) {
  return request(`/clients/${clientId}/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
    token,
  });
}
