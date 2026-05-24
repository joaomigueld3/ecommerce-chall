'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/features/auth/RequireAuth';
import { checkout, getClients } from '@/features/checkout/api';
import { useCart } from '@/features/cart/CartContext';
import { useAuth } from '@/features/auth/AuthContext';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function CheckoutForm() {
  const { items, hydrated, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [clientId, setClientId] = useState('');
  const [lookingUpClient, setLookingUpClient] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  // Best-effort: find the client record linked to the logged-in user so the
  // clientId field is pre-filled. Falls back to manual input if not found.
  useEffect(() => {
    let cancelled = false;
    async function lookup() {
      try {
        const data = await getClients();
        const clients = data?.allClients || [];
        const own = clients.find((c) => c.userId === user?.id);
        if (!cancelled && own) setClientId(String(own.clientId));
      } catch {
        // Ignore: the field stays editable.
      } finally {
        if (!cancelled) setLookingUpClient(false);
      }
    }
    lookup();
    return () => { cancelled = true; };
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = items.map(({ productId, quantity }) => ({ productId, quantity }));
      const result = await checkout(Number(clientId), payload);
      setConfirmation(result);
      clearCart();
    } catch (err) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return <Loading />;

  if (confirmation) {
    return (
      <div className="alert success">
        <p>
          <strong>Order #{confirmation.order?.orderId} placed successfully.</strong>
        </p>
        <p>
          Status: {confirmation.order?.status} — Total charged: {formatPrice(confirmation.order?.total)}
        </p>
        <p>
          <Link href={`/orders/${confirmation.order?.orderId}`}>View order</Link>
          {' · '}
          <Link href="/products">Continue shopping</Link>
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState message="Your cart is empty.">
        <Link href="/products">Browse products</Link> before checking out.
      </EmptyState>
    );
  }

  return (
    <>
      {error && <ErrorMessage message={error} />}
      <div className="card">
        {items.map((item) => (
          <div className="row" key={item.productId} style={{ marginBottom: 8 }}>
            <span className="grow">{item.productName} × {item.quantity}</span>
            <span className="price">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="row">
          <strong className="grow">Estimated total</strong>
          <span className="price">{formatPrice(totalPrice)}</span>
        </div>
        <p className="muted">The final total is computed by the server from current prices.</p>
      </div>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="clientId">Client ID</label>
          <input
            id="clientId"
            type="number"
            min="1"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={lookingUpClient ? 'Looking up your client record…' : 'Enter your client id'}
            required
          />
          <p className="muted">
            Orders belong to a client record. This is pre-filled when a client linked to your user is found.
          </p>
        </div>
        <button type="submit" disabled={submitting || !clientId}>
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <h1>Checkout</h1>
      <CheckoutForm />
    </RequireAuth>
  );
}
