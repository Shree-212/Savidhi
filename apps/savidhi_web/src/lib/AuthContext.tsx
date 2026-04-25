'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getAccessToken,
  setAuthTokens as persistTokens,
  clearAuthTokens as clearTokens,
  AUTH_CHANGE_EVENT,
} from './auth';

interface AuthContextValue {
  /** Current login state. Re-renders subscribers when it changes. */
  isAuthenticated: boolean;
  /** True once the provider has read localStorage on mount (avoids server/client hydration flicker). */
  ready: boolean;
  /** Persist new tokens after a successful login / OTP verify. */
  login: (accessToken: string, refreshToken: string) => void;
  /** Clear tokens (call from a logout button or after a failed refresh). */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage on mount.
    setIsAuthenticated(!!getAccessToken());
    setReady(true);

    // Re-sync whenever auth changes — fired by setAuthTokens / clearAuthTokens
    // in lib/auth.ts AND by the api.ts interceptor on refresh success/failure.
    const sync = () => setIsAuthenticated(!!getAccessToken());

    // Cross-tab sync via storage events (logout in tab A → tab B updates).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'savidhi_token') sync();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    persistTokens(accessToken, refreshToken);
    // persistTokens already emits AUTH_CHANGE_EVENT, but set immediately so
    // the next render is synchronous (avoids a flash of "logged out" UI).
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
