import { request } from '@/lib/api-client';

function buildOrdersQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set('clientId', String(filters.clientId));
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params.toString();
}

export function checkout(token, payload, idempotencyKey) {
  return request('/orders/checkout', {
    method: 'POST',
    body: payload,
    token,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  });
}

export function processOrderPayment(token, orderId, action) {
  return request(`/orders/${orderId}/payment`, {
    method: 'POST',
    body: { action },
    token,
  });
}

export function getOrders(token, filters) {
  const qs = filters ? buildOrdersQuery(filters) : '';
  const path = qs ? `/orders?${qs}` : '/orders';
  return request(path, { token });
}

export function getOrderSummary(token, orderId) {
  return request(`/orders/${orderId}/summary`, { token });
}

export function updateOrderStatus(token, orderId, status) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
    token,
  });
}

export function cancelOrder(token, orderId) {
  return request(`/orders/${orderId}/cancel`, {
    method: 'POST',
    token,
  });
}

export function deleteOrder(token, orderId) {
  return request(`/orders/${orderId}`, {
    method: 'DELETE',
    token,
  });
}
