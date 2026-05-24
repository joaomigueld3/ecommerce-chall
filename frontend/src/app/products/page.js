'use client';

import RequireAuth from '@/features/auth/RequireAuth';
import useApiQuery from '@/hooks/useApiQuery';
import { getProducts } from '@/features/products/api';
import { useCart } from '@/features/cart/CartContext';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function ProductList() {
  const { data: products, loading, error, reload } = useApiQuery(getProducts);
  const { items, addItem } = useCart();

  if (loading) return <Loading label="Loading products…" />;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;
  if (!products || products.length === 0) {
    return <EmptyState message="No products available." />;
  }

  return (
    <>
      {products.map((product) => {
        const inCart = items.find((item) => item.productId === product.productId);
        const outOfStock = Number(product.quantityInStock) <= 0;
        return (
          <div className="card row" key={product.productId}>
            <div className="grow">
              <strong>{product.productName}</strong>
              {product.description && <p className="muted">{product.description}</p>}
              <span className="muted">
                {outOfStock ? 'Out of stock' : `${product.quantityInStock} in stock`}
              </span>
            </div>
            <span className="price">{formatPrice(product.price)}</span>
            <button type="button" onClick={() => addItem(product)} disabled={outOfStock}>
              {inCart ? `Add another (${inCart.quantity} in cart)` : 'Add to cart'}
            </button>
          </div>
        );
      })}
    </>
  );
}

export default function ProductsPage() {
  return (
    <RequireAuth>
      <h1>Products</h1>
      <ProductList />
    </RequireAuth>
  );
}
