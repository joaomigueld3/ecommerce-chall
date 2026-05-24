import { request } from '@/lib/api-client';

export function login(email, password) {
  return request('/login', { method: 'POST', body: { email, password } });
}
