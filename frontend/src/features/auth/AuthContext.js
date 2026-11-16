'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setTokenRefresher } from '@/lib/api-client';
import { login as loginRequest, refreshAuthToken } from './api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ecommerce.token';
const REFRESH_TOKEN_KEY = 'ecommerce.refreshToken';
const USER_KEY = 'ecommerce.user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const refreshInFlightRef = useRef(null);

  /* eslint-disable react-hooks/set-state-in-effect --
     one-time hydration from localStorage after mount; a lazy initializer would
     read localStorage during hydration and mismatch the prerendered HTML */
  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = window.localStorage.getItem(USER_KEY);
      if (storedToken) setToken(storedToken);
      if (storedRefreshToken) setRefreshToken(storedRefreshToken);
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
    setRefreshToken(data.refreshToken ?? null);
    setUser(data.user ?? null);
    window.localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    window.localStorage.setItem(USER_KEY, JSON.stringify(data.user ?? null));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const updateStoredUser = useCallback((partialUser) => {
    setUser((current) => {
      const updated = { ...(current ?? {}), ...partialUser };
      window.localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const activeRefreshToken = refreshToken || window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!activeRefreshToken) return null;

    if (!refreshInFlightRef.current) {
      refreshInFlightRef.current = refreshAuthToken(activeRefreshToken)
        .then((data) => {
          setToken(data.token);
          if (data.refreshToken) {
            setRefreshToken(data.refreshToken);
            window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          window.localStorage.setItem(TOKEN_KEY, data.token);
          return data.token;
        })
        .catch(() => {
          logout();
          return null;
        })
        .finally(() => {
          refreshInFlightRef.current = null;
        });
    }

    return refreshInFlightRef.current;
  }, [refreshToken, logout]);

  useEffect(() => {
    setTokenRefresher(refreshSession);
    return () => setTokenRefresher(null);
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      user,
      isReady,
      isAuthenticated: Boolean(token),
      isAdmin: user?.type === 'Admin',
      login,
      logout,
      updateStoredUser,
      refreshSession,
    }),
    [token, refreshToken, user, isReady, login, logout, updateStoredUser, refreshSession],
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
