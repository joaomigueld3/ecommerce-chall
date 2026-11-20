'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import { useStore } from '@/features/store/StoreContext';
import {
  createStockMovement,
  getInventorySummary,
  getLowStockProducts,
  getStockMovements,
} from '@/features/inventory/api';
import { getProducts, normalizeProductsResponse } from '@/features/products/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const MOVEMENT_TYPES = [
  { value: 'INBOUND', label: 'Inbound Restock (+)' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment (+/-)' },
  { value: 'DAMAGE_LOSS', label: 'Damage / Loss (-)' },
  { value: 'RETURN_RESTOCK', label: 'Return Restock (+)' },
];

function InventoryAdminContent() {
  const { token, logout } = useAuth();
  const { formatMoney } = useStore();
  const router = useRouter();

  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState({
    productId: '',
    type: 'INBOUND',
    quantity: '10',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [sumData, lowData, movData, prodData] = await Promise.all([
          getInventorySummary(token),
          getLowStockProducts(token),
          getStockMovements(token, { limit: 50 }),
          getProducts(token, { includeInactive: true }),
        ]);
        if (ignore) return;
        setSummary(sumData);
        setLowStock(Array.isArray(lowData?.products) ? lowData.products : []);
        setMovements(Array.isArray(movData?.movements) ? movData.movements : []);
        const normalized = normalizeProductsResponse(prodData).items;
        setProducts(normalized);
        setForm((curr) => (curr.productId || normalized.length === 0
          ? curr
          : { ...curr, productId: String(normalized[0].productId) }));
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load inventory data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await createStockMovement(token, {
        productId: Number(form.productId),
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
      });
      setFeedback(
        `${res.message} Stock updated to ${res.product?.quantityInStock} units.`,
      );
      setForm((curr) => ({ ...curr, reason: '' }));
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to record stock movement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickRestock(product) {
    setFormError(null);
    setFeedback(null);
    try {
      await createStockMovement(token, {
        productId: product.productId,
        type: 'INBOUND',
        quantity: 10,
        reason: `Quick restock +10 for ${product.productName}`,
      });
      setFeedback(`Added +10 units to "${product.productName}".`);
      refresh();
    } catch (err) {
      setFormError(err.message || 'Quick restock failed.');
    }
  }

  if (loading) return <Loading message="Loading inventory & Kardex..." />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <section className="stack-lg">
      <div className="page-header">
        <h1>Inventory &amp; Kardex</h1>
        <button type="button" className="btn btn-secondary" onClick={refresh}>
          Refresh
        </button>
      </div>

      {feedback && <p className="alert alert-success">{feedback}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      {summary && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="muted">Active SKUs</span>
            <strong>{summary.activeSkuCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="muted">Total Units in Stock</span>
            <strong>{summary.totalUnits}</strong>
          </div>
          <div className="kpi-card">
            <span className="muted">Low Stock / Out of Stock</span>
            <strong className="stock-out">
              {summary.lowStockCount} low · {summary.outOfStockCount} out
            </strong>
          </div>
          <div className="kpi-card">
            <span className="muted">Inventory Valuation (Retail / Cost)</span>
            <strong>
              {formatMoney(summary.retailValue)} / {formatMoney(summary.costValue)}
            </strong>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Record Stock Movement (Kardex)</h2>
        <form onSubmit={handleSubmit} className="filters-bar">
          <label htmlFor="inv-product">
            Product
            <select
              id="inv-product"
              value={form.productId}
              onChange={(e) => setForm((c) => ({ ...c, productId: e.target.value }))}
              required
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  #{p.productId} — {p.productName} (stock: {p.quantityInStock})
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="inv-type">
            Movement Type
            <select
              id="inv-type"
              value={form.type}
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label htmlFor="inv-qty">
            Quantity
            <input
              id="inv-qty"
              type="number"
              required
              value={form.quantity}
              onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
            />
          </label>
          <label htmlFor="inv-reason">
            Reason (mandatory)
            <input
              id="inv-reason"
              type="text"
              minLength={3}
              required
              placeholder="e.g. Supplier invoice #1042"
              value={form.reason}
              onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}
            />
          </label>
          <button type="submit" className="btn amz-btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Record movement'}
          </button>
        </form>
      </div>

      <div className="stack">
        <h2>Low Stock &amp; Out of Stock Alerts ({lowStock.length})</h2>
        {lowStock.length === 0 ? (
          <EmptyState message="All active products are above their minimum stock threshold." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Level</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.productId}>
                  <td>{p.sku || `#${p.productId}`}</td>
                  <td>{p.productName}</td>
                  <td>{p.category}</td>
                  <td className="stock-out">{p.quantityInStock}</td>
                  <td>{p.minStockLevel ?? 5}</td>
                  <td>
                    <button
                      type="button"
                      className="btn amz-btn-primary btn-sm"
                      onClick={() => handleQuickRestock(p)}
                    >
                      Restock +10
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="stack">
        <h2>Recent Kardex Movements</h2>
        {movements.length === 0 ? (
          <EmptyState message="No stock movements recorded yet." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Delta</th>
                <th>Stock Change</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.movementId}>
                  <td>#{m.movementId}</td>
                  <td>{formatDate(m.createdAt)}</td>
                  <td>{m.Product?.productName || `#${m.productId}`}</td>
                  <td><span className="badge">{m.type}</span></td>
                  <td className={m.quantity > 0 ? 'stock-ok' : 'stock-out'}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td>{m.previousStock} → <strong>{m.newStock}</strong></td>
                  <td className="muted">{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function InventoryAdminPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <InventoryAdminContent />
    </RequireRole>
  );
}
