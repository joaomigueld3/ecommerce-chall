import { request } from '@/lib/apiClient';

export function checkout(clientId, items) {
  return request('/orders/checkout', { method: 'POST', body: { clientId, items } });
}

export function getClients() {
  return request('/clients');
}
