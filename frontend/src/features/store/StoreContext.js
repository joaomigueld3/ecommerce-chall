'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  REGION_LIST,
  REGION_PRESETS,
  STORE_BRAND,
  TRANSLATIONS,
  formatMoney,
  resolveDefaultRegion,
} from '@/lib/store-config';
import { getStoreSettings } from './api';

const StoreContext = createContext(null);
const REGION_STORAGE_KEY = 'ecommerce.region';
const THEME_STORAGE_KEY = 'ecommerce.theme';

export function StoreProvider({ children }) {
  const [region, setRegionState] = useState(resolveDefaultRegion);
  const [theme, setThemeState] = useState('light');
  const [settings, setSettings] = useState(null);

  /* eslint-disable react-hooks/set-state-in-effect --
     one-time client hydration of selected region and theme from localStorage after mount */
  useEffect(() => {
    try {
      const savedRegion = window.localStorage.getItem(REGION_STORAGE_KEY);
      if (savedRegion && REGION_PRESETS[savedRegion]) {
        setRegionState(savedRegion);
      }
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch {
      // ignore storage errors
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshSettings = useCallback(async () => {
    if (typeof fetch !== 'function') return null;
    try {
      const data = await getStoreSettings();
      if (data?.settings) {
        setSettings(data.settings);
        return data.settings;
      }
    } catch {
      // fallback silently to static STORE_BRAND defaults
    }
    return null;
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (typeof fetch !== 'function') return;
      try {
        const data = await getStoreSettings();
        if (!ignore && data?.settings) {
          setSettings(data.settings);
        }
      } catch {
        // fallback silently to static STORE_BRAND defaults
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined' || !settings) return;
    const root = document.documentElement;
    if (settings.primaryColor) {
      root.style.setProperty('--primary', settings.primaryColor);
      root.style.setProperty('--header-bg', settings.primaryColor);
      root.style.setProperty('--cta-primary', settings.primaryColor);
    }
    if (settings.accentColor) {
      root.style.setProperty('--accent', settings.accentColor);
    }
  }, [settings]);

  const setRegion = useCallback((nextRegion) => {
    const normalized = String(nextRegion || '').toUpperCase();
    if (!REGION_PRESETS[normalized]) return;
    setRegionState(normalized);
    try {
      window.localStorage.setItem(REGION_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setTheme = useCallback((nextTheme) => {
    const normalized = nextTheme === 'dark' ? 'dark' : 'light';
    setThemeState(normalized);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const basePreset = REGION_PRESETS[region] || REGION_PRESETS.US;
  const regionConfig = useMemo(() => {
    if (!settings) return basePreset;
    const thresholdKey = basePreset.code === 'BR'
      ? 'freeShippingThresholdBr'
      : basePreset.code === 'EU'
        ? 'freeShippingThresholdEu'
        : 'freeShippingThresholdUs';
    return {
      ...basePreset,
      freeShippingThreshold: Number(settings[thresholdKey] ?? basePreset.freeShippingThreshold),
    };
  }, [basePreset, settings]);

  const brand = useMemo(() => ({
    name: settings?.storeName || STORE_BRAND.name,
    shortPrefix: settings?.shortPrefix || STORE_BRAND.shortPrefix,
    shortSuffix: settings?.shortSuffix ?? STORE_BRAND.shortSuffix,
    tagline: settings?.tagline || null,
    logoUrl: settings?.logoUrl || null,
    supportEmail: settings?.supportEmail || STORE_BRAND.supportEmail,
    supportPhone: settings?.supportPhone || null,
  }), [settings]);

  const messages = TRANSLATIONS[regionConfig.language] || TRANSLATIONS.en;

  const formatCurrency = useCallback(
    (value) => formatMoney(value, regionConfig.code),
    [regionConfig.code],
  );

  const value = useMemo(
    () => ({
      brand,
      storeName: brand.name,
      settings,
      refreshSettings,
      region: regionConfig.code,
      regionConfig,
      regions: REGION_LIST,
      setRegion,
      theme,
      setTheme,
      toggleTheme,
      formatMoney: formatCurrency,
      t: messages,
    }),
    [
      brand,
      settings,
      refreshSettings,
      regionConfig,
      setRegion,
      theme,
      setTheme,
      toggleTheme,
      formatCurrency,
      messages,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used inside a StoreProvider');
  }
  return context;
}
