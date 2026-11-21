import { request } from '@/lib/api-client';

export function getInventorySummary(token) {
  return request('/inventory/summary', { token });
}

export function getLowStockProducts(token) {
  return request('/inventory/low-stock', { token });
}

export function getStockMovements(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.productId) params.set('productId', String(filters.productId));
  if (filters.type) params.set('type', filters.type);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return request(qs ? `/inventory/movements?${qs}` : '/inventory/movements', { token });
}

export function createStockMovement(token, payload) {
  return request('/inventory/movements', { method: 'POST', body: payload, token });
}
