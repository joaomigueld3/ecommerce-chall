import { request } from '@/lib/apiClient';

export function login(email, password) {
  return request('/login', { method: 'POST', body: { email, password }, auth: false });
}
