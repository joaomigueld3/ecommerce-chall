'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useStore } from '@/features/store/StoreContext';
import { getWishlist, removeWishlistItem } from '@/features/wishlist/api';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import ProductImage from '@/components/ui/ProductImage';

function WishlistContent() {
  const { token, logout } = useAuth();
  const { addItem } = useCart();
  const { formatMoney } = useStore();
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getWishlist(token);
        if (ignore) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load wishlist.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleRemove(productId) {
    setMessage(null);
    try {
      await removeWishlistItem(token, productId);
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      setMessage('Removed from wishlist.');
    } catch (err) {
      setError(err.message || 'Failed to remove item.');
    }
  }

  async function handleMoveToCart(entry) {
    if (!entry.product) return;
    addItem(entry.product, 1);
    await handleRemove(entry.productId);
    setMessage(`Moved "${entry.product.productName}" to cart.`);
  }

  if (loading) return <Loading message="Loading wishlist..." />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <section className="stack">
      <div className="page-header">
        <h1>My Wishlist ({items.length})</h1>
        <Link href="/products" className="btn btn-secondary">
          Browse catalog
        </Link>
      </div>

      {message && <p className="alert alert-success">{message}</p>}

      {items.length === 0 ? (
        <EmptyState
          message="Your wishlist is empty. Save your favorite items while browsing."
          actionHref="/products"
          actionLabel="Explore products"
        />
      ) : (
        <div className="grid">
          {items.map((entry) => {
            const p = entry.product;
            if (!p) return null;
            const outOfStock = Number(p.quantityInStock) < 1;
            return (
              <article key={entry.wishlistItemId} className="card amz-product-card">
                <Link href={`/products/${p.productId}`}>
                  <ProductImage product={p} />
                </Link>
                <span className="badge">{p.category}</span>
                <h3>
                  <Link href={`/products/${p.productId}`} className="link-strong">
                    {p.productName}
                  </Link>
                </h3>
                <p className="price price-lg">{formatMoney(p.price)}</p>
                <p className={outOfStock ? 'stock-out' : 'stock-ok'}>
                  {outOfStock ? 'Out of stock' : `${p.quantityInStock} in stock`}
                </p>
                <div className="actions-row">
                  <button
                    type="button"
                    className="btn amz-btn-primary"
                    disabled={outOfStock}
                    onClick={() => handleMoveToCart(entry)}
                  >
                    Move to cart
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRemove(entry.productId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function WishlistPage() {
  return (
    <RequireAuth>
      <WishlistContent />
    </RequireAuth>
  );
}
