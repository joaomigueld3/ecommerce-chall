import { request } from '@/lib/api-client';

export function getWishlist(token) {
  return request('/wishlists', { token });
}

export function addWishlistItem(token, productId) {
  return request('/wishlists/items', { method: 'POST', body: { productId: Number(productId) }, token });
}

export function removeWishlistItem(token, productId) {
  return request(`/wishlists/items/${productId}`, { method: 'DELETE', token });
}
