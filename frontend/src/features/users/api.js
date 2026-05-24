import { request } from '@/lib/api-client';

export function getUserById(token, id) {
  return request(`/users/${id}`, { token });
}

export function updateUser(token, id, payload) {
  return request(`/users/${id}`, { method: 'PUT', body: payload, token });
}
