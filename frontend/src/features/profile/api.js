import { request } from '@/lib/apiClient';

export function getUser(id) {
  return request(`/users/${encodeURIComponent(id)}`);
}

export function updateUser(id, data) {
  return request(`/users/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
}
