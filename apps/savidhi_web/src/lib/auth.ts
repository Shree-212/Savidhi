'use client';

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('savidhi_token', accessToken);
    localStorage.setItem('savidhi_refresh_token', refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('savidhi_token');
  }
  return null;
}

export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('savidhi_token');
    localStorage.removeItem('savidhi_refresh_token');
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
