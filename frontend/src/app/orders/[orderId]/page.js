'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import useApiQuery from '@/hooks/useApiQuery';
import { getOrderSummary } from '@/features/orders/api';
import { formatPrice, formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

function OrderDetails({ orderId }) {
  const { data: summary, loading, error, reload } = useApiQuery(
    () => getOrderSummary(orderId),
    [orderId],
  );

  if (loading) return <Loading label="Loading order…" />;

  if (error) {
    if (error.status === 404) {
      return (
        <EmptyState message={`Order #${orderId} was not found.`}>
          <Link href="/orders">Back to orders</Link>.
        </EmptyState>
      );
    }
    return <ErrorMessage message={error.message} onRetry={reload} />;
  }

  if (!summary) return null;

  const { order, items } = summary;

  return (
    <>
      {summary.warning && <div className="alert error">{summary.warning}</div>}
      <div className="card">
        <div className="row">
          <strong className="grow">Order #{order.orderId}</strong>
          <StatusBadge status={order.status} />
        </div>
        <p className="muted">
          Placed on {formatDate(order.orderDate)} · client {order.clientId ?? '—'}
        </p>
      </div>

      <h2>Items</h2>
      {(!items || items.length === 0) ? (
        <EmptyState message="This order has no items." />
      ) : (
        items.map((item) => (
          <div className="card row" key={`${order.orderId}-${item.productId}`}>
            <div className="grow">
              <strong>Product #{item.productId}</strong>
              <p className="muted">
                {item.quantity} × {formatPrice(item.pricePerUnit)}
              </p>
            </div>
            <span className="price">{formatPrice(item.subtotal)}</span>
          </div>
        ))
      )}

      <h2>Totals</h2>
      <div className="card">
        <div className="row">
          <span className="grow">Recomputed from items</span>
          <span className="price">{formatPrice(summary.recomputedTotal)}</span>
        </div>
        <div className="row">
          <span className="grow">Persisted on the order</span>
          <span className="price">{formatPrice(summary.persistedTotal)}</span>
        </div>
        <p className="muted">
          {summary.consistent
            ? 'Totals are consistent.'
            : 'Totals do not match — see the warning above.'}
        </p>
      </div>

      <Link href="/orders">← Back to orders</Link>
    </>
  );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.orderId;

  return (
    <RequireAuth>
      <h1>Order details</h1>
      <OrderDetails orderId={orderId} />
    </RequireAuth>
  );
}
