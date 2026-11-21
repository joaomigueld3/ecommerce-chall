'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import { useStore } from '@/features/store/StoreContext';
import { getStoreSettings, updateStoreSettings } from '@/features/store/api';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';

const COLOR_PRESETS = [
  { label: 'Pool Blue', primary: '#0094b6', accent: '#00b4d8' },
  { label: 'Emerald', primary: '#047857', accent: '#10b981' },
  { label: 'Royal Indigo', primary: '#3730a3', accent: '#6366f1' },
  { label: 'Slate Pro', primary: '#1e293b', accent: '#0ea5e9' },
];

function StoreSettingsContent() {
  const { token, logout } = useAuth();
  const { refreshSettings } = useStore();
  const router = useRouter();

  const [form, setForm] = useState({
    storeName: 'omni.store',
    shortPrefix: 'omni',
    shortSuffix: '.store',
    tagline: '',
    logoUrl: '',
    primaryColor: '#0094b6',
    accentColor: '#00b4d8',
    defaultRegion: 'US',
    freeShippingThresholdBr: '200',
    freeShippingThresholdUs: '50',
    freeShippingThresholdEu: '50',
    supportEmail: '',
    supportPhone: '',
    legalEntityName: '',
    taxId: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getStoreSettings();
        if (ignore) return;
        const s = data?.settings;
        if (s) {
          setForm({
            storeName: s.storeName ?? 'omni.store',
            shortPrefix: s.shortPrefix ?? 'omni',
            shortSuffix: s.shortSuffix ?? '.store',
            tagline: s.tagline ?? '',
            logoUrl: s.logoUrl ?? '',
            primaryColor: s.primaryColor ?? '#0094b6',
            accentColor: s.accentColor ?? '#00b4d8',
            defaultRegion: s.defaultRegion ?? 'US',
            freeShippingThresholdBr: String(s.freeShippingThresholdBr ?? 200),
            freeShippingThresholdUs: String(s.freeShippingThresholdUs ?? 50),
            freeShippingThresholdEu: String(s.freeShippingThresholdEu ?? 50),
            supportEmail: s.supportEmail ?? '',
            supportPhone: s.supportPhone ?? '',
            legalEntityName: s.legalEntityName ?? '',
            taxId: s.taxId ?? '',
          });
        }
        setError(null);
      } catch (err) {
        if (!ignore) setError(err.message || 'Failed to load store settings.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        storeName: form.storeName.trim(),
        shortPrefix: form.shortPrefix.trim(),
        shortSuffix: form.shortSuffix.trim(),
        tagline: form.tagline.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        defaultRegion: form.defaultRegion,
        freeShippingThresholdBr: Number(form.freeShippingThresholdBr),
        freeShippingThresholdUs: Number(form.freeShippingThresholdUs),
        freeShippingThresholdEu: Number(form.freeShippingThresholdEu),
        supportEmail: form.supportEmail.trim() || null,
        supportPhone: form.supportPhone.trim() || null,
        legalEntityName: form.legalEntityName.trim() || null,
        taxId: form.taxId.trim() || null,
      };
      await updateStoreSettings(token, payload);
      await refreshSettings();
      setMessage('Store white-label settings saved and applied live!');
    } catch (err) {
      if (err.status === 401) {
        logout();
        router.replace('/login');
        return;
      }
      setFormError(err.message || 'Failed to save settings.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading message="Loading store settings..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>White-Label Store Settings</h1>
          <p className="muted">
            Customize brand identity, theme colors, regional defaults (BR / US / EU) and commercial policies without editing code.
          </p>
        </div>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <form onSubmit={handleSubmit} className="card form">
        <h2>Brand Identity &amp; Palette</h2>
        <div className="chip-row">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip"
              onClick={() => setForm((c) => ({
                ...c,
                primaryColor: preset.primary,
                accentColor: preset.accent,
              }))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="form-grid-2">
          <label htmlFor="s-name">
            Store Name
            <input
              id="s-name"
              type="text"
              value={form.storeName}
              onChange={(e) => setForm((c) => ({ ...c, storeName: e.target.value }))}
              required
            />
          </label>
          <label htmlFor="s-prefix">
            Header Brand Prefix
            <input
              id="s-prefix"
              type="text"
              value={form.shortPrefix}
              onChange={(e) => setForm((c) => ({ ...c, shortPrefix: e.target.value }))}
              required
            />
          </label>
          <label htmlFor="s-suffix">
            Header Brand Suffix
            <input
              id="s-suffix"
              type="text"
              value={form.shortSuffix}
              onChange={(e) => setForm((c) => ({ ...c, shortSuffix: e.target.value }))}
            />
          </label>
          <label htmlFor="s-region">
            Default Region
            <select
              id="s-region"
              value={form.defaultRegion}
              onChange={(e) => setForm((c) => ({ ...c, defaultRegion: e.target.value }))}
            >
              <option value="BR">Brasil (PT-BR · R$)</option>
              <option value="US">United States (EN-US · $)</option>
              <option value="EU">Europe (EN · €)</option>
            </select>
          </label>
          <label htmlFor="s-primary">
            Primary Brand Color
            <input
              id="s-primary"
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm((c) => ({ ...c, primaryColor: e.target.value }))}
            />
          </label>
          <label htmlFor="s-accent">
            Accent Color
            <input
              id="s-accent"
              type="color"
              value={form.accentColor}
              onChange={(e) => setForm((c) => ({ ...c, accentColor: e.target.value }))}
            />
          </label>
        </div>

        <label htmlFor="s-tagline">
          Hero Tagline
          <input
            id="s-tagline"
            type="text"
            value={form.tagline}
            onChange={(e) => setForm((c) => ({ ...c, tagline: e.target.value }))}
          />
        </label>

        <h2>Regional Free Shipping Thresholds &amp; Legal Info</h2>
        <div className="form-grid-2">
          <label htmlFor="s-ship-br">
            Free Shipping BR (R$)
            <input
              id="s-ship-br"
              type="number"
              min="0"
              step="0.01"
              value={form.freeShippingThresholdBr}
              onChange={(e) => setForm((c) => ({ ...c, freeShippingThresholdBr: e.target.value }))}
            />
          </label>
          <label htmlFor="s-ship-us">
            Free Shipping US ($)
            <input
              id="s-ship-us"
              type="number"
              min="0"
              step="0.01"
              value={form.freeShippingThresholdUs}
              onChange={(e) => setForm((c) => ({ ...c, freeShippingThresholdUs: e.target.value }))}
            />
          </label>
          <label htmlFor="s-ship-eu">
            Free Shipping EU (€)
            <input
              id="s-ship-eu"
              type="number"
              min="0"
              step="0.01"
              value={form.freeShippingThresholdEu}
              onChange={(e) => setForm((c) => ({ ...c, freeShippingThresholdEu: e.target.value }))}
            />
          </label>
          <label htmlFor="s-email">
            Support Email
            <input
              id="s-email"
              type="email"
              value={form.supportEmail}
              onChange={(e) => setForm((c) => ({ ...c, supportEmail: e.target.value }))}
            />
          </label>
          <label htmlFor="s-phone">
            Support Phone / WhatsApp
            <input
              id="s-phone"
              type="text"
              value={form.supportPhone}
              onChange={(e) => setForm((c) => ({ ...c, supportPhone: e.target.value }))}
            />
          </label>
          <label htmlFor="s-entity">
            Legal Entity Name (Invoice)
            <input
              id="s-entity"
              type="text"
              value={form.legalEntityName}
              onChange={(e) => setForm((c) => ({ ...c, legalEntityName: e.target.value }))}
            />
          </label>
          <label htmlFor="s-tax">
            Company Tax ID / CNPJ / VAT
            <input
              id="s-tax"
              type="text"
              value={form.taxId}
              onChange={(e) => setForm((c) => ({ ...c, taxId: e.target.value }))}
            />
          </label>
        </div>

        <button type="submit" className="btn amz-btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save white-label settings'}
        </button>
      </form>
    </section>
  );
}

export default function StoreSettingsPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <StoreSettingsContent />
    </RequireRole>
  );
}
