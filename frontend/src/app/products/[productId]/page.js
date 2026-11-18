'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { getProductById } from '@/features/products/api';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function ProductDetailsContent() {
  const { productId } = useParams();
  const { token, logout } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getProductById(token, productId);
        if (ignore) return;
        setProduct(data);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        if (err.status === 404 || err.status === 400) {
          setNotFound(true);
          return;
        }
        setError(err.message || 'Failed to load product.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, productId, logout, router]);

  if (loading) return <Loading message="Loading product..." />;
  if (notFound) {
    return (
      <section>
        <h1>Product not found</h1>
        <EmptyState
          message={`No product found with id "${productId}".`}
          actionHref="/products"
          actionLabel="Back to products"
        />
      </section>
    );
  }
  if (error) return <ErrorMessage message={error} />;

  const outOfStock = Number(product.quantityInStock) < 1;

  function handleAdd() {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    addItem(product, qty);
    setAddedMsg(`Added ${qty} unit(s) to cart.`);
  }

  return (
    <section className="card narrow">
      <div className="page-header">
        <h1>{product.productName}</h1>
        <Link href="/products" className="btn btn-secondary">
          Back
        </Link>
      </div>

      {product.category && <span className="badge">{product.category}</span>}
      {product.description && <p className="muted">{product.description}</p>}
      <p className="price">$ {formatPrice(product.price)}</p>
      <p className="muted">
        {outOfStock ? 'Out of stock' : `${product.quantityInStock} units available`}
      </p>

      {addedMsg && <p className="alert alert-success">{addedMsg}</p>}

      {!outOfStock && (
        <div className="actions-row">
          <input
            type="number"
            min={1}
            max={product.quantityInStock}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="Quantity"
          />
          <button type="button" className="btn" onClick={handleAdd}>
            Add to cart
          </button>
          <Link href="/cart" className="btn btn-secondary">
            Go to cart
          </Link>
        </div>
      )}
    </section>
  );
}

export default function ProductDetailsPage() {
  return (
    <RequireAuth>
      <ProductDetailsContent />
    </RequireAuth>
  );
}
