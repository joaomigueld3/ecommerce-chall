'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { getOrders } from '@/features/orders/api';
import { formatDate, formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const ORDER_STATUS_OPTIONS = [
  'Pending Payment',
  'Received',
  'In Preparation',
  'Dispatched',
  'Delivered',
  'Cancelled',
];

const EMPTY_FILTERS = {
  status: '',
  clientId: '',
  startDate: '',
  endDate: '',
};

function OrdersContent() {
  const { token, isAdmin, logout } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = appliedFilters
          ? await getOrders(token, appliedFilters)
          : await getOrders(token);
        if (ignore) return;
        const allOrders = data?.allOrders ?? [];
        setOrders([...allOrders].sort((a, b) => b.orderId - a.orderId));
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load orders.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, appliedFilters, logout, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    const next = {};
    if (filters.status) next.status = filters.status;
    if (isAdmin && filters.clientId) next.clientId = filters.clientId;
    if (filters.startDate) next.startDate = `${filters.startDate}T00:00:00.000Z`;
    if (filters.endDate) next.endDate = `${filters.endDate}T23:59:59.999Z`;

    setLoading(true);
    setAppliedFilters(Object.keys(next).length > 0 ? next : null);
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setLoading(true);
    setAppliedFilters(null);
  }

  if (loading) {
    return <Loading message="Loading orders..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Orders</h1>
        <Link href="/products" className="btn btn-secondary">
          Browse products
        </Link>
      </div>

      <form onSubmit={handleApplyFilters} className="filters-bar">
        <label htmlFor="order-status">
          Status
          <select
            id="order-status"
            value={filters.status}
            onChange={(event) => setFilters((c) => ({ ...c, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {isAdmin && (
          <label htmlFor="order-client-id">
            Client ID
            <input
              id="order-client-id"
              type="number"
              min="1"
              value={filters.clientId}
              onChange={(event) => setFilters((c) => ({ ...c, clientId: event.target.value }))}
            />
          </label>
        )}

        <label htmlFor="order-start-date">
          Start date
          <input
            id="order-start-date"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((c) => ({ ...c, startDate: event.target.value }))}
          />
        </label>

        <label htmlFor="order-end-date">
          End date
          <input
            id="order-end-date"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((c) => ({ ...c, endDate: event.target.value }))}
          />
        </label>

        <div className="actions-row">
          <button type="submit" className="btn">
            Filter
          </button>
          {appliedFilters && (
            <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
              Clear
            </button>
          )}
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          message={appliedFilters ? 'No orders match these filters.' : 'No orders yet.'}
          actionHref="/products"
          actionLabel="Place your first order"
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Client</th>
              <th>Status</th>
              <th>Date</th>
              <th>Total</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId}>
                <td>#{order.orderId}</td>
                <td>#{order.clientId}</td>
                <td>{order.status}</td>
                <td>{formatDate(order.orderDate)}</td>
                <td>$ {formatPrice(order.total)}</td>
                <td>
                  <Link href={`/orders/${order.orderId}`} className="btn btn-secondary">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}
