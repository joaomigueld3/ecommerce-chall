'use client';

import Link from 'next/link';
import RequireAuth from '@/features/auth/RequireAuth';
import { useCart } from '@/features/cart/CartContext';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import EmptyState from '@/components/ui/EmptyState';

function CartContents() {
  const { items, hydrated, setQuantity, removeItem, totalPrice } = useCart();

  if (!hydrated) return <Loading label="Loading cart…" />;

  if (items.length === 0) {
    return (
      <EmptyState message="Your cart is empty.">
        <Link href="/products">Browse products</Link>.
      </EmptyState>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div className="card row" key={item.productId}>
          <div className="grow">
            <strong>{item.productName}</strong>
            <p className="muted">{formatPrice(item.price)} each</p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => setQuantity(item.productId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            className="qty"
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => setQuantity(item.productId, e.target.value)}
            aria-label={`Quantity of ${item.productName}`}
          />
          <button
            type="button"
            className="secondary"
            onClick={() => setQuantity(item.productId, item.quantity + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
          <span className="price">{formatPrice(item.price * item.quantity)}</span>
          <button type="button" className="danger" onClick={() => removeItem(item.productId)}>
            Remove
          </button>
        </div>
      ))}
      <div className="card row">
        <div className="grow"><strong>Total</strong></div>
        <span className="price">{formatPrice(totalPrice)}</span>
      </div>
      <Link href="/checkout">
        <button type="button">Go to checkout</button>
      </Link>
    </>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <h1>Cart</h1>
      <CartContents />
    </RequireAuth>
  );
}
