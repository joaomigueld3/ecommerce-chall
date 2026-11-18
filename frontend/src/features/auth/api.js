import { request } from '@/lib/api-client';

export function login(email, password) {
  return request('/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true,
  });
}

export function register(payload) {
  return request('/signin', {
    method: 'POST',
    body: payload,
    skipAuthRefresh: true,
  });
}

export function confirmEmail(token) {
  return request(`/confirmation/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    skipAuthRefresh: true,
  });
}

export function refreshAuthToken(refreshToken) {
  return request('/refresh-token', {
    method: 'POST',
    body: { refreshToken },
    skipAuthRefresh: true,
  });
}
