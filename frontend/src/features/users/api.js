import { request } from '@/lib/api-client';

function buildUsersQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.name) params.set('name', filters.name);
  if (filters.email) params.set('email', filters.email);
  if (filters.type) params.set('type', filters.type);
  return params.toString();
}

export function getUsers(token, filters) {
  const qs = filters ? buildUsersQuery(filters) : '';
  return request(qs ? `/users?${qs}` : '/users', { token });
}

export function getUserById(token, id) {
  return request(`/users/${id}`, { token });
}

export function createUser(token, payload) {
  return request('/users', { method: 'POST', body: payload, token });
}

export function updateUser(token, id, payload) {
  return request(`/users/${id}`, { method: 'PUT', body: payload, token });
}

export function deleteUser(token, id) {
  return request(`/users/${id}`, { method: 'DELETE', token });
}

export function changePassword(token, payload) {
  return request('/change-password', { method: 'PUT', body: payload, token });
}
