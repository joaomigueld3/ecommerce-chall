'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { getOrderSummary } from '@/features/orders/api';
import { formatDate, formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function OrderDetailsContent() {
  const { orderId } = useParams();
  const { token, logout } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getOrderSummary(token, orderId);
        if (ignore) return;
        setSummary(data);
        setError(null);
        setNotFound(false);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        if (err.status === 404 || err.status === 400) {
          setNotFound(true);
          return;
        }
        setError(err.message || 'Failed to load the order.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, orderId, reloadKey, logout, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <Loading message="Loading order..." />;
  }

  if (notFound) {
    return (
      <section>
        <h1>Order not found</h1>
        <EmptyState
          message={`No order found with id "${orderId}".`}
          actionHref="/orders"
          actionLabel="Back to orders"
        />
      </section>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  const { order, items, recomputedTotal, persistedTotal, consistent, warning } = summary;

  return (
    <section>
      <div className="page-header">
        <h1>Order #{order.orderId}</h1>
        <Link href="/orders" className="btn btn-secondary">
          Back to orders
        </Link>
      </div>

      <div className="card">
        <ul className="summary-list">
          <li>
            <strong>Status:</strong> {order.status}
          </li>
          <li>
            <strong>Date:</strong> {formatDate(order.orderDate)}
          </li>
          <li>
            <strong>Client:</strong> #{order.clientId}
          </li>
          <li>
            <strong>Total:</strong> $ {formatPrice(persistedTotal ?? order.total)}
          </li>
        </ul>
      </div>

      <h2>Items</h2>
      {items.length === 0 ? (
        <EmptyState message="This order has no items." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.itemId}>
                <td>#{item.productId}</td>
                <td>{item.quantity}</td>
                <td>$ {formatPrice(item.pricePerUnit)}</td>
                <td>$ {formatPrice(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card">
        <ul className="summary-list">
          <li>
            <strong>Recomputed total (from items):</strong> $ {formatPrice(recomputedTotal)}
          </li>
          <li>
            <strong>Persisted total:</strong> $ {formatPrice(persistedTotal)}
          </li>
        </ul>
        {consistent ? (
          <p className="alert alert-success">Totals are consistent.</p>
        ) : (
          <p className="alert alert-error">{warning || 'Totals do not match.'}</p>
        )}
      </div>
    </section>
  );
}

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}
