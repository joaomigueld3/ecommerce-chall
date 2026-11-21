'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useStore } from '@/features/store/StoreContext';
import {
  getProductCategories,
  getProducts,
  normalizeProductsResponse,
} from '@/features/products/api';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import ProductImage from '@/components/ui/ProductImage';
import StarRating from '@/components/ui/StarRating';

export default function StorefrontHomePage() {
  const { token, isAuthenticated } = useAuth();
  const { addItem, items } = useCart();
  const { storeName, regionConfig, formatMoney, t } = useStore();

  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadStorefront() {
      try {
        const [catData, dealsData, latestData] = await Promise.all([
          getProductCategories(token).catch(() => ({ categories: [] })),
          getProducts(token, {
            page: 1,
            limit: 4,
            sortBy: 'price',
            sortOrder: 'asc',
            available: true,
          }),
          getProducts(token, {
            page: 1,
            limit: 8,
            sortBy: 'productId',
            sortOrder: 'desc',
          }),
        ]);
        if (ignore) return;

        setCategories(Array.isArray(catData?.categories) ? catData.categories : []);
        setDeals(normalizeProductsResponse(dealsData).items);
        setFeatured(normalizeProductsResponse(latestData).items);
        setError(null);
      } catch (err) {
        if (!ignore) setError(err.message || 'Failed to load storefront.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStorefront();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey]);

  function quantityInCart(productId) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="stack-lg">
      <section className="amz-hero">
        <div className="amz-hero-content">
          <span className="amz-hero-eyebrow">{t.heroEyebrow(storeName, regionConfig.label)}</span>
          <h1>{t.heroTitle}</h1>
          <p className="amz-hero-subtitle">{t.heroSubtitle}</p>
          <div className="actions-row">
            <Link href="/products" className="btn amz-btn-primary">
              {t.shopAllProducts}
            </Link>
            <Link href="/products?sortBy=price&sortOrder=asc&available=true" className="btn amz-btn-hero-secondary">
              {t.exploreBestDeals}
            </Link>
            {!isAuthenticated && (
              <Link href="/login" className="btn amz-btn-hero-secondary">
                {t.signInForOrders}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="amz-perks" aria-label="Store highlights">
        <div className="amz-perk-card">
          <strong>{t.perkStockTitle}</strong>
          <span className="muted">{t.perkStockDesc}</span>
        </div>
        <div className="amz-perk-card">
          <strong>{t.perkCheckoutTitle}</strong>
          <span className="muted">{t.perkCheckoutDesc}</span>
        </div>
        <div className="amz-perk-card">
          <strong>{t.perkTrackingTitle}</strong>
          <span className="muted">{t.perkTrackingDesc}</span>
        </div>
        <div className="amz-perk-card">
          <strong>{t.perkCancelTitle}</strong>
          <span className="muted">{t.perkCancelDesc}</span>
        </div>
      </section>

      {loading && <Loading message="Loading storefront..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={handleRetry} />}

      {!loading && !error && categories.length > 0 && (
        <section className="stack">
          <div className="section-header">
            <h2>{t.shopByDepartment}</h2>
            <Link href="/products" className="link-accent">
              {t.viewAllCatalog}
            </Link>
          </div>
          <div className="amz-dept-grid">
            {categories.map((entry) => (
              <Link
                key={entry.category}
                href={`/products?category=${encodeURIComponent(entry.category)}`}
                className="amz-dept-card"
              >
                <span className="amz-dept-title">{entry.category}</span>
                <span className="muted">{t.productCount(entry.productCount)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && deals.length > 0 && (
        <section className="stack">
          <div className="section-header">
            <h2>{t.bestValuePicks}</h2>
            <Link href="/products?sortBy=price&sortOrder=asc&available=true" className="link-accent">
              {t.seeAllDeals}
            </Link>
          </div>
          <div className="grid">
            {deals.map((product) => {
              const inCart = quantityInCart(product.productId);
              return (
                <article key={product.productId} className="card amz-product-card">
                  <Link href={`/products/${product.productId}`}>
                    <ProductImage product={product} />
                  </Link>
                  <div className="amz-product-meta">
                    <span className="badge">{product.category || 'General'}</span>
                    <span className="amz-deal-tag">{t.greatValue}</span>
                  </div>
                  <h3>
                    <Link href={`/products/${product.productId}`} className="link-strong">
                      {product.productName}
                    </Link>
                  </h3>
                  {product.description && <p className="muted amz-clamp">{product.description}</p>}
                  {Number(product.ratingCount) > 0 && (
                    <StarRating rating={product.ratingAvg} count={product.ratingCount} />
                  )}
                  <div>
                    {Number(product.originalPrice) > Number(product.price) && (
                      <span className="price-strike">{formatMoney(product.originalPrice)}</span>
                    )}
                    <p className="price price-lg">{formatMoney(product.price)}</p>
                  </div>
                  <p className="stock-ok">
                    {t.inStockAvailable(product.quantityInStock)}
                    {inCart > 0 && t.inCartSuffix(inCart)}
                  </p>
                  <div className="actions-row">
                    <button
                      type="button"
                      className="btn amz-btn-primary"
                      onClick={() => addItem(product)}
                    >
                      {t.addToCart}
                    </button>
                    <Link href={`/products/${product.productId}`} className="btn btn-secondary">
                      {t.details}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className="stack">
          <div className="section-header">
            <h2>{t.latestArrivals}</h2>
            <Link href="/products" className="link-accent">
              {t.browseFullCatalog}
            </Link>
          </div>
          {featured.length === 0 ? (
            <EmptyState message="No products registered in the catalog yet." />
          ) : (
            <div className="grid">
              {featured.map((product) => {
                const outOfStock = Number(product.quantityInStock) < 1;
                const inCart = quantityInCart(product.productId);
                return (
                  <article key={product.productId} className="card amz-product-card">
                    <Link href={`/products/${product.productId}`}>
                      <ProductImage product={product} />
                    </Link>
                    <span className="badge">{product.category || 'General'}</span>
                    <h3>
                      <Link href={`/products/${product.productId}`} className="link-strong">
                        {product.productName}
                      </Link>
                    </h3>
                    {product.description && <p className="muted amz-clamp">{product.description}</p>}
                    <p className="price price-lg">{formatMoney(product.price)}</p>
                    <p className={outOfStock ? 'stock-out' : 'stock-ok'}>
                      {outOfStock ? t.outOfStock : t.inStockCount(product.quantityInStock)}
                      {inCart > 0 && t.inCartSuffix(inCart)}
                    </p>
                    <div className="actions-row">
                      <button
                        type="button"
                        className="btn amz-btn-primary"
                        disabled={outOfStock}
                        onClick={() => addItem(product)}
                      >
                        {t.addToCart}
                      </button>
                      <Link href={`/products/${product.productId}`} className="btn btn-secondary">
                        {t.details}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
