import { request } from '@/lib/api-client';

export function getStoreSettings() {
  return request('/store-settings');
}

export function updateStoreSettings(token, payload) {
  return request('/store-settings', { method: 'PUT', body: payload, token });
}
