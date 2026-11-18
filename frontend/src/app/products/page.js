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

const EMPTY_FILTERS = {
  productName: '',
  categories: '',
  minPrice: '',
  maxPrice: '',
  availableOnly: false,
};

function ProductsContent() {
  const { token, logout } = useAuth();
  const { addItem, items } = useCart();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = appliedFilters
          ? await getProducts(token, appliedFilters)
          : await getProducts(token);
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
  }, [token, reloadKey, appliedFilters, logout, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    const next = {};
    if (filters.productName.trim()) next.productName = filters.productName.trim();
    if (filters.categories.trim()) next.categories = filters.categories.trim();
    if (filters.minPrice !== '') next.minPrice = filters.minPrice;
    if (filters.maxPrice !== '') next.maxPrice = filters.maxPrice;
    if (filters.availableOnly) next.available = true;

    setLoading(true);
    setAppliedFilters(Object.keys(next).length > 0 ? next : null);
  }

  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
    setLoading(true);
    setAppliedFilters(null);
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

      <form onSubmit={handleApplyFilters} className="filters-bar">
        <label htmlFor="filter-name">
          Search
          <input
            id="filter-name"
            type="text"
            placeholder="Product name"
            value={filters.productName}
            onChange={(event) => setFilters((c) => ({ ...c, productName: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-categories">
          Categories (comma-separated)
          <input
            id="filter-categories"
            type="text"
            placeholder="Audio, Peripherals"
            value={filters.categories}
            onChange={(event) => setFilters((c) => ({ ...c, categories: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-min-price">
          Min price
          <input
            id="filter-min-price"
            type="number"
            min="0"
            step="0.01"
            value={filters.minPrice}
            onChange={(event) => setFilters((c) => ({ ...c, minPrice: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-max-price">
          Max price
          <input
            id="filter-max-price"
            type="number"
            min="0"
            step="0.01"
            value={filters.maxPrice}
            onChange={(event) => setFilters((c) => ({ ...c, maxPrice: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-available" className="checkbox-label">
          <input
            id="filter-available"
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(event) => setFilters((c) => ({ ...c, availableOnly: event.target.checked }))}
          />
          In stock only
        </label>

        <div className="actions-row">
          <button type="submit" className="btn">
            Filter
          </button>
          {appliedFilters && (
            <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
              Clear
            </button>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <EmptyState
          message={appliedFilters
            ? 'No products match the selected filters.'
            : 'No products registered in the API yet.'}
        />
      ) : (
        <div className="grid">
          {products.map((product) => {
            const outOfStock = Number(product.quantityInStock) < 1;
            const inCart = quantityInCart(product.productId);
            return (
              <article key={product.productId} className="card">
                {product.category && <span className="badge">{product.category}</span>}
                <h2>{product.productName}</h2>
                {product.description && <p className="muted">{product.description}</p>}
                <p className="price">$ {formatPrice(product.price)}</p>
                <p className="muted">
                  {outOfStock ? 'Out of stock' : `${product.quantityInStock} in stock`}
                  {inCart > 0 && ` — ${inCart} in cart`}
                </p>
                <div className="actions-row">
                  <button
                    type="button"
                    className="btn"
                    disabled={outOfStock}
                    onClick={() => addItem(product)}
                  >
                    Add to cart
                  </button>
                  <Link href={`/products/${product.productId}`} className="btn btn-secondary">
                    Details
                  </Link>
                </div>
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
