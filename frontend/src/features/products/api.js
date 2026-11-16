import { request } from '@/lib/api-client';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.productName) params.set('productName', filters.productName);
  if (filters.description) params.set('description', filters.description);
  if (filters.categories) params.set('categories', filters.categories);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice !== undefined && filters.minPrice !== '') params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') params.set('maxPrice', String(filters.maxPrice));
  if (filters.available !== undefined && filters.available !== '') params.set('available', String(filters.available));
  return params.toString();
}

export function getProducts(token, filters) {
  const qs = filters ? buildQuery(filters) : '';
  const path = qs ? `/products?${qs}` : '/products';
  return request(path, { token });
}

export function getProductById(token, productId) {
  return request(`/products/${productId}`, { token });
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
