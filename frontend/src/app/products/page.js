'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { getProducts } from '@/features/products/api';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function ProductsContent() {
  const { token, logout } = useAuth();
  const { addItem, items } = useCart();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getProducts(token);
        if (ignore) return;
        setProducts(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load products.');
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

  function quantityInCart(productId) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  if (loading) {
    return <Loading message="Loading products..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Products</h1>
        <Link href="/cart" className="btn btn-secondary">
          Go to cart
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState message="No products registered in the API yet." />
      ) : (
        <div className="grid">
          {products.map((product) => {
            const outOfStock = Number(product.quantityInStock) < 1;
            const inCart = quantityInCart(product.productId);
            return (
              <article key={product.productId} className="card">
                <h2>{product.productName}</h2>
                {product.description && <p className="muted">{product.description}</p>}
                <p className="price">$ {formatPrice(product.price)}</p>
                <p className="muted">
                  {outOfStock ? 'Out of stock' : `${product.quantityInStock} in stock`}
                  {inCart > 0 && ` — ${inCart} in cart`}
                </p>
                <button
                  type="button"
                  className="btn"
                  disabled={outOfStock}
                  onClick={() => addItem(product)}
                >
                  Add to cart
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ProductsPage() {
  return (
    <RequireAuth>
      <ProductsContent />
    </RequireAuth>
  );
}
