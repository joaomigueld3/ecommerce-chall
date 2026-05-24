import { request } from '@/lib/apiClient';

export function getProducts() {
  return request('/products');
}

export function createProduct(productData) {
  return request('/products', { method: 'POST', body: productData });
}

export function updateProduct(productId, productData) {
  return request(`/products/${encodeURIComponent(productId)}`, { method: 'PUT', body: productData });
}

export function deleteProduct(productId) {
  return request(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}
