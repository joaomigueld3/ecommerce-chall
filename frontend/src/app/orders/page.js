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

function OrdersContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getOrders(token);
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
  }, [token, reloadKey, logout, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
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

      {orders.length === 0 ? (
        <EmptyState
          message="No orders yet."
          actionHref="/products"
          actionLabel="Place your first order"
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
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
