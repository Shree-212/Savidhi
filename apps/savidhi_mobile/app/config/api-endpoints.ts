import { ENV } from './env';

const BASE = `${ENV.API_URL}/api/v1`;

export const API_ENDPOINTS = {
  // Auth
  LOGIN:   `${BASE}/auth/login`,
  LOGOUT:  `${BASE}/auth/logout`,
  REFRESH: `${BASE}/auth/refresh`,

  // User
  ME: `${BASE}/users/me`,
} as const;
