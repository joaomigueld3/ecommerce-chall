'use client';

import Link from 'next/link';
import RequireAuth from '@/features/auth/RequireAuth';
import useApiQuery from '@/hooks/useApiQuery';
import { getOrders } from '@/features/orders/api';
import { formatPrice, formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

function OrderList() {
  const { data: orders, loading, error, reload } = useApiQuery(getOrders);

  if (loading) return <Loading label="Loading orders…" />;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;
  if (!orders || orders.length === 0) {
    return (
      <EmptyState message="No orders yet.">
        <Link href="/products">Browse products</Link> to place your first one.
      </EmptyState>
    );
  }

  const sorted = [...orders].sort((a, b) => b.orderId - a.orderId);

  return (
    <>
      <p className="muted">
        The API does not scope orders to the authenticated user, so every order visible to this account is listed.
      </p>
      {sorted.map((order) => (
        <Link key={order.orderId} href={`/orders/${order.orderId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card row">
            <div className="grow">
              <strong>Order #{order.orderId}</strong>
              <p className="muted">{formatDate(order.orderDate)} · client {order.clientId ?? '—'}</p>
            </div>
            <StatusBadge status={order.status} />
            <span className="price">{formatPrice(order.total)}</span>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <h1>Orders</h1>
      <OrderList />
    </RequireAuth>
  );
}
