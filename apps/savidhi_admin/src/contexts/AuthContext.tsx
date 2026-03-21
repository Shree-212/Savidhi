'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/services';
import { apiClient } from '../lib/api';

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

function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('savidhi_admin_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('savidhi_admin_token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore token from localStorage on mount
    const token = localStorage.getItem('savidhi_admin_token');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('savidhi_admin_token');
      if (!token) { setIsLoading(false); return; }
      const res = await authService.getMe();
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
      } else {
        setToken(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await authService.login(email, password);
    if (res.data?.success && res.data?.data?.user) {
      setToken(res.data.data.accessToken);
      setUser(res.data.data.user);
    } else {
      throw new Error(res.data?.message || 'Login failed');
    }
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      setToken(null);
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
