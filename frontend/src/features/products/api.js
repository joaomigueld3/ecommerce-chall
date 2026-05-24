import { request } from '@/lib/api-client';

export function getProducts(token) {
  return request('/products', { token });
}

export function createProduct(token, payload) {
  return request('/products', { method: 'POST', body: payload, token });
}

export function updateProduct(token, productId, payload) {
  return request(`/products/${productId}`, { method: 'PUT', body: payload, token });
}

export function deleteProduct(token, productId) {
  return request(`/products/${productId}`, { method: 'DELETE', token });
}
