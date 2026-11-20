import { request } from '@/lib/api-client';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.productName) params.set('productName', filters.productName);
  if (filters.description) params.set('description', filters.description);
  if (filters.categories) params.set('categories', filters.categories);
  if (filters.category) params.set('category', filters.category);
  if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
  if (filters.brandId) params.set('brandId', String(filters.brandId));
  if (filters.featured) params.set('featured', 'true');
  if (filters.isDealOfDay) params.set('isDealOfDay', 'true');
  if (filters.minRating !== undefined && filters.minRating !== '') params.set('minRating', String(filters.minRating));
  if (filters.includeInactive) params.set('includeInactive', 'true');
  if (filters.minPrice !== undefined && filters.minPrice !== '') params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') params.set('maxPrice', String(filters.maxPrice));
  if (filters.available !== undefined && filters.available !== '') params.set('available', String(filters.available));
  if (filters.page !== undefined && filters.page !== '') params.set('page', String(filters.page));
  if (filters.limit !== undefined && filters.limit !== '') params.set('limit', String(filters.limit));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  return params.toString();
}

export function normalizeProductsResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: {
        page: 1,
        limit: data.length || 20,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: items.length || 20,
    total: items.length,
    totalPages: items.length > 0 ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  return { items, pagination };
}

export function getProducts(token = null, filters) {
  const qs = filters ? buildQuery(filters) : '';
  const path = qs ? `/products?${qs}` : '/products';
  return request(path, { token });
}

export function getProductCategories(token = null) {
  return request('/products/categories', { token });
}

export function getBrands(token = null) {
  return request('/brands', { token });
}

export function getCategoriesTaxonomy(token = null) {
  return request('/categories', { token });
}

export function getProductById(token = null, productId) {
  return request(`/products/${productId}`, { token });
}

export function getRelatedProducts(token = null, productId, limit = 4) {
  return request(`/products/${productId}/related?limit=${limit}`, { token });
}

export function getProductReviews(token = null, productId) {
  return request(`/products/${productId}/reviews`, { token });
}

export function createProductReview(token, productId, payload) {
  return request(`/products/${productId}/reviews`, { method: 'POST', body: payload, token });
}

export function markReviewHelpful(token = null, productId, reviewId) {
  return request(`/products/${productId}/reviews/${reviewId}/helpful`, { method: 'POST', token });
}

export function getProductQuestions(token = null, productId) {
  return request(`/products/${productId}/questions`, { token });
}

export function createProductQuestion(token, productId, payload) {
  return request(`/products/${productId}/questions`, { method: 'POST', body: payload, token });
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
