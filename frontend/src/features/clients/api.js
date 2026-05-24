import { request } from '@/lib/api-client';

export function getClients(token) {
  return request('/clients', { token });
}
