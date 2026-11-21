'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useStore } from '@/features/store/StoreContext';
import EmptyState from '@/components/ui/EmptyState';

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const {
    items,
    savedItems,
    removeItem,
    updateQuantity,
    saveForLater,
    moveToCartFromSaved,
    removeSavedItem,
    totalPrice,
    totalItems,
  } = useCart();
  const { formatMoney, t } = useStore();

  return (
    <section className="stack-lg">
      {items.length === 0 ? (
        <div className="card">
          <h1>{t.shoppingCart}</h1>
          <EmptyState message={t.emptyCart} actionHref="/products" actionLabel={t.browseProducts} />
        </div>
      ) : (
        <div className="stack">
          <div className="page-header">
            <h1>{t.shoppingCart} ({totalItems})</h1>
            <Link href="/products" className="btn btn-secondary">
              {t.continueShopping}
            </Link>
          </div>

          {!isAuthenticated && (
            <p className="alert alert-info">{t.guestCartNotice}</p>
          )}

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
                  <td>
                    <Link href={`/products/${item.productId}`} className="link-strong">
                      {item.productName}
                    </Link>
                  </td>
                  <td>{formatMoney(item.price)}</td>
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
                  <td>{formatMoney(item.price * item.quantity)}</td>
                  <td>
                    <div className="actions-row">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => saveForLater(item.productId)}
                      >
                        Save for later
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(item.productId)}
                      >
                        {t.removeBtn}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="card cart-footer">
            <div>
              <p className="muted">{t.subtotalLabel} ({totalItems})</p>
              <p className="price price-lg">{formatMoney(totalPrice)}</p>
            </div>
            <Link href="/checkout" className="btn amz-btn-primary">
              {t.proceedToCheckout}
            </Link>
          </div>
        </div>
      )}

      {savedItems.length > 0 && (
        <section className="card stack">
          <h2>Saved for later ({savedItems.length})</h2>
          <div className="grid">
            {savedItems.map((item) => (
              <article key={item.productId} className="review-card">
                <Link href={`/products/${item.productId}`} className="link-strong">
                  {item.productName}
                </Link>
                <p className="price">{formatMoney(item.price)}</p>
                <div className="actions-row">
                  <button
                    type="button"
                    className="btn amz-btn-primary btn-sm"
                    onClick={() => moveToCartFromSaved(item.productId)}
                  >
                    Move to cart
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeSavedItem(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
