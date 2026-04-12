import { getToken, setToken, getRefreshToken, setRefreshToken, getApiBase, clearToken, clearRefreshToken, clearUser } from './storage';
import { ApiResponse } from './types';

// ── Refresh queue — holds requests that arrive while a refresh is in-flight ──
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function flushQueue(error: unknown, token: string | null) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  refreshQueue = [];
}

/** Exchange stored refresh token for a new access token. */
async function silentRefresh(): Promise<string> {
  const base = await getApiBase();
  const refreshToken = await getRefreshToken();

  if (!refreshToken) throw new Error('No refresh token — please log in again.');

  const res = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Extension can't use httpOnly cookies, so send refresh token in body
    body: JSON.stringify({ refreshToken }),
  });

  const json: ApiResponse<{ accessToken: string; refreshToken?: string }> = await res.json();

  if (!res.ok || !json.data?.accessToken) {
    throw new Error(json.message ?? 'Session expired — please log in again.');
  }

  await setToken(json.data.accessToken);
  if (json.data.refreshToken) await setRefreshToken(json.data.refreshToken);

  return json.data.accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const [token, base] = await Promise.all([getToken(), getApiBase()]);
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(url, { ...options, headers });
  const json: ApiResponse<T> = await res.json();

  // ── Silent token refresh ───────────────────────────────────────────────────
  if (res.status === 401 && json.code === 'TOKEN_EXPIRED') {
    if (isRefreshing) {
      // Wait for the in-flight refresh, then retry
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) =>
        fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } })
          .then((r) => r.json())
      );
    }

    isRefreshing = true;
    try {
      const newToken = await silentRefresh();
      flushQueue(null, newToken);
      const retryRes = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
      return retryRes.json();
    } catch (err) {
      flushQueue(err, null);
      // Refresh token is expired/invalid — clear all auth and force re-login
      await Promise.all([clearToken(), clearRefreshToken(), clearUser()]);
      throw new Error('Session expired. Please log in again.');
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
