'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '@/features/auth/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // ready=false until localStorage has been read on the client, so guards
  // don't redirect before hydration.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem('token');
    const storedUser = window.localStorage.getItem('user');
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        window.localStorage.removeItem('user');
      }
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    window.localStorage.setItem('token', data.token);
    window.localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const patchUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...patch };
      window.localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    token,
    user,
    ready,
    isAuthenticated: Boolean(token),
    login,
    logout,
    patchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
