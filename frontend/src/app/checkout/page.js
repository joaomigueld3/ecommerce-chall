'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { checkout } from '@/features/orders/api';
import { getClients } from '@/features/clients/api';
import { formatPrice } from '@/lib/format';
import EmptyState from '@/components/ui/EmptyState';

function CheckoutContent() {
  const { token, user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientId, setClientId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      try {
        const data = await getClients(token);
        if (ignore) return;
        const allClients = data?.allClients ?? [];
        setClients(allClients);
        setClientsError(null);

        const ownClient = allClients.find((client) => client.userId === user?.id);
        if (ownClient) {
          setClientId(String(ownClient.clientId));
        } else if (allClients.length > 0) {
          setClientId(String(allClients[0].clientId));
        }
      } catch (err) {
        if (!ignore) setClientsError(err.message || 'Failed to load clients.');
      } finally {
        if (!ignore) setLoadingClients(false);
      }
    }

    loadClients();
    return () => {
      ignore = true;
    };
  }, [token, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        clientId: Number(clientId),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
      const data = await checkout(token, payload);
      setResult(data);
      clearCart();
    } catch (err) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="card narrow">
        <h1>Order placed</h1>
        <p className="alert alert-success">{result.message || 'Checkout completed.'}</p>
        <ul className="summary-list">
          <li>
            <strong>Order:</strong> #{result.order?.orderId}
          </li>
          <li>
            <strong>Status:</strong> {result.order?.status}
          </li>
          <li>
            <strong>Total:</strong> $ {formatPrice(result.order?.total)}
          </li>
          <li>
            <strong>Items:</strong> {result.items?.length ?? 0}
          </li>
        </ul>
        <div className="actions-row">
          <Link href={`/orders/${result.order?.orderId}`} className="btn">
            View order details
          </Link>
          <Link href="/products" className="btn btn-secondary">
            Back to products
          </Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section>
        <h1>Checkout</h1>
        <EmptyState message="Your cart is empty." actionHref="/products" actionLabel="Browse products" />
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Checkout</h1>

      <h2>Order summary</h2>
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
            <tr key={item.productId}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>$ {formatPrice(item.price)}</td>
              <td>$ {formatPrice(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="price">Estimated total: $ {formatPrice(totalPrice)}</p>
      <p className="muted">The final total is computed by the API from current product prices.</p>

      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="clientId">
          Client
          {loadingClients && <span className="muted"> Loading clients...</span>}
          {!loadingClients && !clientsError && clients.length > 0 && (
            <select
              id="clientId"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
            >
              {clients.map((client) => (
                <option key={client.clientId} value={client.clientId}>
                  #{client.clientId} — {client.fullName}
                </option>
              ))}
            </select>
          )}
          {!loadingClients && (clientsError || clients.length === 0) && (
            <>
              {clientsError && <span className="alert alert-error">{clientsError}</span>}
              <input
                id="clientId"
                type="number"
                min={1}
                placeholder="Client ID"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                required
              />
            </>
          )}
        </label>

        <button type="submit" className="btn" disabled={submitting || !clientId}>
          {submitting ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
