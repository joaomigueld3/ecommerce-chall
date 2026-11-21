'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import { useStore } from '@/features/store/StoreContext';
import { getClientOverview, updateClientCrm } from '@/features/clients/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function Client360Content() {
  const { clientId } = useParams();
  const { token, logout } = useAuth();
  const { formatMoney } = useStore();
  const router = useRouter();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [crmForm, setCrmForm] = useState({
    tier: 'Standard',
    loyaltyPoints: '0',
    creditBalance: '0',
    status: true,
    blockedReason: '',
    internalNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getClientOverview(token, clientId);
        if (ignore) return;
        setOverview(data);
        setCrmForm({
          tier: data.client?.tier || 'Standard',
          loyaltyPoints: String(data.client?.loyaltyPoints ?? 0),
          creditBalance: String(data.client?.creditBalance ?? 0),
          status: data.client?.status !== false,
          blockedReason: data.client?.blockedReason || '',
          internalNotes: data.client?.internalNotes || '',
        });
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load client 360 overview.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, clientId, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleCrmSubmit(event) {
    event.preventDefault();
    setMessage(null);
    setSaveError(null);
    setSaving(true);
    try {
      await updateClientCrm(token, clientId, {
        tier: crmForm.tier,
        loyaltyPoints: Number(crmForm.loyaltyPoints || 0),
        creditBalance: Number(crmForm.creditBalance || 0),
        status: Boolean(crmForm.status),
        blockedReason: crmForm.blockedReason.trim() || null,
        internalNotes: crmForm.internalNotes.trim() || null,
      });
      setMessage('Client CRM profile updated.');
      refresh();
    } catch (err) {
      setSaveError(err.message || 'Failed to update CRM data.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading message="Loading client 360° profile..." />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;
  if (!overview?.client) return <EmptyState message="Client not found." actionHref="/admin/clients" actionLabel="Back to clients" />;

  const { client, linkedUser, crm, addresses, paymentMethods, orders } = overview;

  return (
    <section className="stack-lg">
      <div className="page-header">
        <div>
          <div className="actions-row">
            <h1>{client.fullName}</h1>
            <span className="badge">{client.tier}</span>
            <span className="badge">{client.country}</span>
            <span className="badge">{client.status ? 'Active' : 'Inactive / Blocked'}</span>
          </div>
          <p className="muted">
            Client #{client.clientId}
            {client.documentType && client.documentNumber ? ` • ${client.documentType}: ${client.documentNumber}` : ''}
            {client.email ? ` • ${client.email}` : ''}
            {client.phone ? ` • ${client.phone}` : ''}
          </p>
        </div>
        <Link href="/admin/clients" className="btn btn-secondary">
          ← Back to Clients
        </Link>
      </div>

      {/* CRM KPI Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="muted">Lifetime Value (LTV)</span>
          <strong>{formatMoney(crm.ltv)}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Average Order Ticket</span>
          <strong>{formatMoney(crm.averageOrderValue)}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Orders (Paid / Total)</span>
          <strong>{crm.paidOrdersCount} / {crm.totalOrders}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Cancellation Rate</span>
          <strong>{crm.cancellationRate}%</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Loyalty &amp; Store Credit</span>
          <strong>{client.loyaltyPoints} pts · {formatMoney(client.creditBalance)}</strong>
        </div>
      </div>

      {/* Admin CRM Control Form */}
      <div className="card">
        <h2>CRM Tier, Loyalty &amp; Account Status</h2>
        {message && <p className="alert alert-success">{message}</p>}
        {saveError && <p className="alert alert-error">{saveError}</p>}

        <form onSubmit={handleCrmSubmit} className="form">
          <div className="form-grid-2">
            <label htmlFor="crm-tier">
              Customer Tier
              <select
                id="crm-tier"
                value={crmForm.tier}
                onChange={(e) => setCrmForm((c) => ({ ...c, tier: e.target.value }))}
              >
                <option value="Standard">Standard</option>
                <option value="Prime">Prime</option>
                <option value="VIP">VIP</option>
              </select>
            </label>
            <label htmlFor="crm-points">
              Loyalty Points
              <input
                id="crm-points"
                type="number"
                min="0"
                value={crmForm.loyaltyPoints}
                onChange={(e) => setCrmForm((c) => ({ ...c, loyaltyPoints: e.target.value }))}
              />
            </label>
            <label htmlFor="crm-credit">
              Store Credit Balance
              <input
                id="crm-credit"
                type="number"
                min="0"
                step="0.01"
                value={crmForm.creditBalance}
                onChange={(e) => setCrmForm((c) => ({ ...c, creditBalance: e.target.value }))}
              />
            </label>
            <label htmlFor="crm-blocked">
              Block / Deactivation Reason
              <input
                id="crm-blocked"
                type="text"
                value={crmForm.blockedReason}
                onChange={(e) => setCrmForm((c) => ({ ...c, blockedReason: e.target.value }))}
              />
            </label>
          </div>
          <label htmlFor="crm-notes">
            Internal Admin Notes (hidden from customer)
            <textarea
              id="crm-notes"
              rows={2}
              value={crmForm.internalNotes}
              onChange={(e) => setCrmForm((c) => ({ ...c, internalNotes: e.target.value }))}
            />
          </label>
          <label htmlFor="crm-status" className="checkbox-label">
            <input
              id="crm-status"
              type="checkbox"
              checked={crmForm.status}
              onChange={(e) => setCrmForm((c) => ({ ...c, status: e.target.checked }))}
            />
            Account Active
          </label>
          <button type="submit" className="btn amz-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save CRM updates'}
          </button>
        </form>
      </div>

      {linkedUser && (
        <div className="card">
          <h2>Linked Auth Account</h2>
          <p className="muted">
            User #{linkedUser.id} • {linkedUser.email} • Role: {linkedUser.type} • Confirmed: {linkedUser.confirmed ? 'Yes' : 'No'}
          </p>
        </div>
      )}

      {/* Addresses & Wallet */}
      <div className="form-grid-2">
        <div className="card">
          <h2>Saved Addresses ({addresses.length})</h2>
          {addresses.length === 0 ? (
            <p className="muted">No structured addresses registered yet.</p>
          ) : (
            <div className="stack">
              {addresses.map((a) => (
                <div key={a.addressId} className="review-card">
                  <div className="actions-row">
                    <strong>{a.label}</strong>
                    <span className="badge">{a.country}</span>
                    {a.isDefaultShipping && <span className="verified-pill">Default Shipping</span>}
                  </div>
                  <p>{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ''}</p>
                  <p className="muted">{a.city}, {a.state} • {a.postalCode}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Saved Wallet Methods ({paymentMethods.length})</h2>
          {paymentMethods.length === 0 ? (
            <p className="muted">No payment methods saved yet.</p>
          ) : (
            <div className="stack">
              {paymentMethods.map((m) => (
                <div key={m.paymentMethodId} className="review-card">
                  <div className="actions-row">
                    <strong>{m.brand} •••• {m.last4}</strong>
                    {m.isDefault && <span className="verified-pill">Default</span>}
                  </div>
                  <p className="muted">
                    {m.holderName}{m.expMonth && m.expYear ? ` • Exp ${String(m.expMonth).padStart(2, '0')}/${m.expYear}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="stack">
        <h2>Order History ({orders.length})</h2>
        {orders.length === 0 ? (
          <EmptyState message="This client has not placed any orders yet." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>#{order.orderId}</td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td><span className="badge">{order.status}</span></td>
                  <td>{formatMoney(order.total)}</td>
                  <td>
                    <Link href={`/orders/${order.orderId}`} className="btn btn-secondary btn-sm">
                      Inspect order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function Client360Page() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <Client360Content />
    </RequireRole>
  );
}
