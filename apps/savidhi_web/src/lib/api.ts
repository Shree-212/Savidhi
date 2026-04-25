import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AUTH_CHANGE_EVENT } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const ACCESS_KEY = 'savidhi_token';
const REFRESH_KEY = 'savidhi_refresh_token';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every outgoing request.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Refresh-on-401 ───────────────────────────────────────────────────────────
// When a request comes back 401, attempt to refresh the access token using the
// stored refresh token (auth-service `POST /auth/refresh` rotates both tokens).
// If refresh succeeds, retry the original request transparently. If it fails
// (refresh expired / revoked), clear tokens and let the caller redirect.
// Concurrent 401s are coalesced — only one refresh is in flight at a time;
// everyone else awaits the same promise.

let refreshPromise: Promise<string | null> | null = null;

function clearTokensAndNotify() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    // Use a bare axios (not `api`) so the request interceptor doesn't loop us
    // back through the auth-attachment, and so the response interceptor below
    // doesn't try to refresh on the refresh call itself.
    const resp = await axios.post(
      `${API_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const data = resp.data?.data ?? resp.data;
    const newAccess: string | undefined = data?.accessToken;
    const newRefresh: string | undefined = data?.refreshToken;
    if (!newAccess) return null;

    localStorage.setItem(ACCESS_KEY, newAccess);
    if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    return newAccess;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      typeof window === 'undefined' ||
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/otp/')
    ) {
      // If the refresh endpoint itself 401's, the refresh token is dead — clear.
      if (original?.url?.includes('/auth/refresh')) clearTokensAndNotify();
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    if (!newToken) {
      clearTokensAndNotify();
      return Promise.reject(error);
    }

    if (original.headers) {
      original.headers.Authorization = `Bearer ${newToken}`;
    }
    return api(original);
  },
);

export default api;
