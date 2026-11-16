const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9095/api';

let tokenRefresher = null;

export function setTokenRefresher(fn) {
  tokenRefresher = fn;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function doFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the API. Is the backend running?', 0, null);
  }
  return response;
}

export async function request(
  path,
  { method = 'GET', body, token, headers = {}, skipAuthRefresh = false } = {},
) {
  let response = await doFetch(path, { method, body, token, headers });

  if (response.status === 401 && token && !skipAuthRefresh && typeof tokenRefresher === 'function') {
    const nextToken = await tokenRefresher();
    if (nextToken) {
      response = await doFetch(path, { method, body, token: nextToken, headers });
    }
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export async function requestBlob(path, { token, skipAuthRefresh = false } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Could not reach the API. Is the backend running?', 0, null);
  }

  if (response.status === 401 && token && !skipAuthRefresh && typeof tokenRefresher === 'function') {
    const nextToken = await tokenRefresher();
    if (nextToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      });
    }
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const message = data?.message || data?.error || `Download failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return response.blob();
}

export { API_BASE_URL };
