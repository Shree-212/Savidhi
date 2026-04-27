import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const REFRESH_STORAGE_KEY = 'savidhi_admin_refresh';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// A bare axios used by the refresh call so it cannot trigger the 401 interceptor recursively.
const refreshClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (refreshPromise) return refreshPromise;

  const refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
  if (!refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const res = await refreshClient.post('/auth/refresh', { refreshToken });
      const newRefresh = res.data?.data?.refreshToken;
      if (newRefresh) window.localStorage.setItem(REFRESH_STORAGE_KEY, newRefresh);
      return Boolean(res.data?.success);
    } catch {
      window.localStorage.removeItem(REFRESH_STORAGE_KEY);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = err.response?.status;
    const url = original?.url ?? '';

    // Don't try to refresh on auth endpoints themselves.
    const isAuthEndpoint = url.includes('/auth/login')
      || url.includes('/auth/refresh')
      || url.includes('/auth/logout');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const ok = await refreshAccessToken();
      if (ok) {
        return apiClient.request(original);
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
