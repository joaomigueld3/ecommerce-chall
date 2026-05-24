import { request } from '@/lib/apiClient';

export async function getOrders() {
  const data = await request('/orders');
  return Array.isArray(data?.allOrders) ? data.allOrders : [];
}

export function getOrderSummary(orderId) {
  return request(`/orders/${encodeURIComponent(orderId)}/summary`);
}
