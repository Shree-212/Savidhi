'use client';

const ACCESS_KEY = 'savidhi_token';
const REFRESH_KEY = 'savidhi_refresh_token';

/** Custom event fired whenever the auth state changes (login / logout / refresh failure).
 *  Listened to by AuthContext so components re-render. */
export const AUTH_CHANGE_EVENT = 'savidhi:auth-change';

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    emit();
  }
}

export function setAccessToken(accessToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_KEY, accessToken);
    emit();
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    emit();
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
