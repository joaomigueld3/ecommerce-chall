import { request } from '@/lib/api-client';

export function checkout(token, payload) {
  return request('/orders/checkout', { method: 'POST', body: payload, token });
}

export function getOrders(token) {
  return request('/orders', { token });
}

export function getOrderSummary(token, orderId) {
  return request(`/orders/${orderId}/summary`, { token });
}
