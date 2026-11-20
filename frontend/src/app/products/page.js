'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'productId:desc', label: 'Newest arrivals', sortBy: 'productId', sortOrder: 'desc' },
  { value: 'ratingAvg:desc', label: 'Top rated', sortBy: 'ratingAvg', sortOrder: 'desc' },
  { value: 'salesCount:desc', label: 'Best sellers', sortBy: 'salesCount', sortOrder: 'desc' },
  { value: 'price:asc', label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price:desc', label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' },
  { value: 'productName:asc', label: 'Name: A to Z', sortBy: 'productName', sortOrder: 'asc' },
  { value: 'quantityInStock:desc', label: 'Availability: Most in stock', sortBy: 'quantityInStock', sortOrder: 'desc' },
];

const EMPTY_FILTERS = {
  productName: '',
  categories: '',
  minPrice: '',
  maxPrice: '',
  availableOnly: false,
  sort: 'productId:desc',
};

function parseInitialState(searchString) {
  const params = new URLSearchParams(searchString);
  const productName = params.get('productName') || '';
  const category = params.get('category') || '';
  const categories = params.get('categories') || category;
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const availableOnly = params.get('available') === 'true';
  const sortBy = params.get('sortBy') || 'productId';
  const sortOrder = (params.get('sortOrder') || 'desc').toLowerCase();
  const sortValue = `${sortBy}:${sortOrder}`;
  const validSort = SORT_OPTIONS.some((opt) => opt.value === sortValue)
    ? sortValue
    : 'productId:desc';
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);

  return {
    filters: {
      productName,
      categories,
      minPrice,
      maxPrice,
      availableOnly,
      sort: validSort,
    },
    page,
  };
}

function buildApiParams(filters, page) {
  const sortOption = SORT_OPTIONS.find((opt) => opt.value === filters.sort) || SORT_OPTIONS[0];
  const params = {
    page,
    limit: PAGE_SIZE,
    sortBy: sortOption.sortBy,
    sortOrder: sortOption.sortOrder,
  };
  if (filters.productName.trim()) params.productName = filters.productName.trim();
  if (filters.categories.trim()) params.categories = filters.categories.trim();
  if (filters.minPrice !== '') params.minPrice = filters.minPrice;
  if (filters.maxPrice !== '') params.maxPrice = filters.maxPrice;
  if (filters.availableOnly) params.available = true;
  return params;
}

function hasCustomFilters(filters) {
  return Boolean(
    filters.productName.trim()
    || filters.categories.trim()
    || filters.minPrice !== ''
    || filters.maxPrice !== ''
    || filters.availableOnly,
  );
}

function ProductsCatalogContent({ initialSearch }) {
  const { token } = useAuth();
  const { addItem, items } = useCart();
  const { formatMoney, t } = useStore();

  const [initial] = useState(() => parseInitialState(initialSearch));
  const [formFilters, setFormFilters] = useState(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState(initial.filters);
  const [page, setPage] = useState(initial.page);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      try {
        const data = await getProductCategories(token);
        if (!ignore && Array.isArray(data?.categories)) {
          setCategories(data.categories);
        }
      } catch {
        // non-blocking
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const apiParams = buildApiParams(appliedFilters, page);
        const data = await getProducts(token, apiParams);
        if (ignore) return;

        const normalized = normalizeProductsResponse(data);
        setProducts(normalized.items);
        setPagination(normalized.pagination);
        setError(null);
      } catch (err) {
        if (ignore) return;
        setError(err.message || 'Failed to load products.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, appliedFilters, page, reloadKey]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setAppliedFilters({ ...formFilters });
  }

  function handleResetFilters() {
    setFormFilters(EMPTY_FILTERS);
    setLoading(true);
    setPage(1);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function handleCategoryChip(categoryName) {
    const next = { ...formFilters, categories: categoryName };
    setFormFilters(next);
    setLoading(true);
    setPage(1);
    setAppliedFilters(next);
  }

  function handleSortChange(nextSort) {
    const next = { ...formFilters, sort: nextSort };
    setFormFilters(next);
    setLoading(true);
    setPage(1);
    setAppliedFilters(next);
  }

  function handlePageChange(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  function quantityInCart(productId) {
    return items.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  const activeFilters = hasCustomFilters(appliedFilters);

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>{t.catalogTitle}</h1>
          {!loading && !error && (
            <p className="muted">
              {t.resultCount(pagination.total)}
              {appliedFilters.productName ? ` — "${appliedFilters.productName}"` : ''}
              {appliedFilters.categories ? ` (${appliedFilters.categories})` : ''}
            </p>
          )}
        </div>
        <div className="actions-row">
          <label htmlFor="sort-products" className="sort-control">
            <span className="muted">{t.sortBy}</span>
            <select
              id="sort-products"
              value={formFilters.sort}
              onChange={(event) => handleSortChange(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Link href="/cart" className="btn btn-secondary">
            {t.goToCart}
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="chip-row" role="navigation" aria-label="Filter by department">
          <button
            type="button"
            className={`chip ${!appliedFilters.categories ? 'chip-active' : ''}`}
            onClick={() => handleCategoryChip('')}
          >
            {t.allDepartmentsChip}
          </button>
          {categories.map((entry) => {
            const isSelected = appliedFilters.categories.toLowerCase() === entry.category.toLowerCase();
            return (
              <button
                key={entry.category}
                type="button"
                className={`chip ${isSelected ? 'chip-active' : ''}`}
                onClick={() => handleCategoryChip(entry.category)}
              >
                {entry.category} ({entry.productCount})
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={handleApplyFilters} className="filters-bar">
        <label htmlFor="filter-name">
          {t.searchLabel}
          <input
            id="filter-name"
            type="text"
            placeholder="Product name"
            value={formFilters.productName}
            onChange={(event) => setFormFilters((c) => ({ ...c, productName: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-categories">
          {t.categoriesLabel}
          <input
            id="filter-categories"
            type="text"
            placeholder="Audio, Peripherals"
            value={formFilters.categories}
            onChange={(event) => setFormFilters((c) => ({ ...c, categories: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-min-price">
          {t.minPriceLabel}
          <input
            id="filter-min-price"
            type="number"
            min="0"
            step="0.01"
            value={formFilters.minPrice}
            onChange={(event) => setFormFilters((c) => ({ ...c, minPrice: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-max-price">
          {t.maxPriceLabel}
          <input
            id="filter-max-price"
            type="number"
            min="0"
            step="0.01"
            value={formFilters.maxPrice}
            onChange={(event) => setFormFilters((c) => ({ ...c, maxPrice: event.target.value }))}
          />
        </label>

        <label htmlFor="filter-available" className="checkbox-label">
          <input
            id="filter-available"
            type="checkbox"
            checked={formFilters.availableOnly}
            onChange={(event) => setFormFilters((c) => ({ ...c, availableOnly: event.target.checked }))}
          />
          {t.inStockOnly}
        </label>

        <div className="actions-row">
          <button type="submit" className="btn amz-btn-primary">
            {t.filterBtn}
          </button>
          {activeFilters && (
            <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
              {t.clearBtn}
            </button>
          )}
        </div>
      </form>

      {loading && <Loading message="Loading products..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={handleRetry} />}

      {!loading && !error && products.length === 0 && (
        <EmptyState
          message={activeFilters
            ? 'No products match the selected filters.'
            : 'No products registered in the API yet.'}
        />
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="grid">
            {products.map((product) => {
              const outOfStock = Number(product.quantityInStock) < 1;
              const inCart = quantityInCart(product.productId);
              return (
                <article key={product.productId} className="card amz-product-card">
                  <Link href={`/products/${product.productId}`}>
                    <ProductImage product={product} />
                  </Link>
                  {product.category && <span className="badge">{product.category}</span>}
                  <h2>
                    <Link href={`/products/${product.productId}`} className="link-strong">
                      {product.productName}
                    </Link>
                  </h2>
                  {product.description && <p className="muted amz-clamp">{product.description}</p>}
                  {Number(product.ratingCount) > 0 && (
                    <StarRating rating={product.ratingAvg} count={product.ratingCount} />
                  )}
                  <div>
                    {Number(product.originalPrice) > Number(product.price) && (
                      <div className="actions-row">
                        <span className="price-strike">{formatMoney(product.originalPrice)}</span>
                        <span className="discount-pill">
                          -{Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)}%
                        </span>
                      </div>
                    )}
                    <p className="price price-lg">{formatMoney(product.price)}</p>
                  </div>
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

          {pagination.totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Catalog pagination">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                {t.previousPage}
              </button>
              <span className="muted">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} items)
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                {t.nextPage}
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function ProductsPageWrapper() {
  const searchParams = useSearchParams();
  const searchString = searchParams ? searchParams.toString() : '';
  return <ProductsCatalogContent key={searchString} initialSearch={searchString} />;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading message="Loading products..." />}>
      <ProductsPageWrapper />
    </Suspense>
  );
}
