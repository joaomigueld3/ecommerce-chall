'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest } from './api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ecommerce.token';
const USER_KEY = 'ecommerce.user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
     one-time hydration from localStorage after mount; a lazy initializer would
     read localStorage during hydration and mismatch the prerendered HTML */
  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem(TOKEN_KEY);
      const storedUser = window.localStorage.getItem(USER_KEY);
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      // corrupted storage: start logged out
    }
    setIsReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUser(data.user ?? null);
    window.localStorage.setItem(TOKEN_KEY, data.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(data.user ?? null));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const updateStoredUser = useCallback((partialUser) => {
    setUser((current) => {
      const updated = { ...(current ?? {}), ...partialUser };
      window.localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isReady,
      isAuthenticated: Boolean(token),
      login,
      logout,
      updateStoredUser,
    }),
    [token, user, isReady, login, logout, updateStoredUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
