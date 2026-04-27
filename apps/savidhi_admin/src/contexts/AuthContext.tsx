'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authService } from '../lib/services';
import { REFRESH_STORAGE_KEY, refreshAccessToken } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Access token TTL is 30m on the backend. Refresh well before expiry.
const REFRESH_INTERVAL_MS = 25 * 60 * 1000;

function storeRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
  else window.localStorage.removeItem(REFRESH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    checkAuth();
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRefreshLoop() {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshAccessToken();
    }, REFRESH_INTERVAL_MS);
  }

  // When the tab becomes visible after being hidden, force a refresh so the
  // access cookie is fresh before the user resumes interaction.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        void refreshAccessToken();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  async function checkAuth() {
    try {
      const res = await authService.getMe();
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
        startRefreshLoop();
      }
    } catch {
      storeRefreshToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await authService.login(email, password);
    if (res.data?.success && res.data?.data?.user) {
      storeRefreshToken(res.data.data.refreshToken ?? null);
      setUser(res.data.data.user);
      startRefreshLoop();
    } else {
      throw new Error(res.data?.message || 'Login failed');
    }
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      storeRefreshToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
