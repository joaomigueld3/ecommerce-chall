'use client';

import Link from 'next/link';
import RequireAuth from '@/features/auth/RequireAuth';
import { useCart } from '@/features/cart/CartContext';
import { formatPrice } from '@/lib/format';
import EmptyState from '@/components/ui/EmptyState';

function CartContent() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <section>
        <h1>Cart</h1>
        <EmptyState message="Your cart is empty." actionHref="/products" actionLabel="Browse products" />
      </section>
    );
  }

  return (
    <section>
      <h1>Cart</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Unit price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId}>
              <td>{item.productName}</td>
              <td>$ {formatPrice(item.price)}</td>
              <td>
                <div className="quantity-controls">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.productName}`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.productId, event.target.value)}
                    aria-label={`Quantity of ${item.productName}`}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.productName}`}
                  >
                    +
                  </button>
                </div>
              </td>
              <td>$ {formatPrice(item.price * item.quantity)}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeItem(item.productId)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cart-footer">
        <p className="price">Total: $ {formatPrice(totalPrice)}</p>
        <Link href="/checkout" className="btn">
          Proceed to checkout
        </Link>
      </div>
    </section>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
