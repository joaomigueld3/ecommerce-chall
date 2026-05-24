'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { createProduct, deleteProduct, getProducts, updateProduct } from '@/features/products/api';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const EMPTY_FORM = {
  productName: '',
  description: '',
  price: '',
  quantityInStock: '',
};

function ProductAdminContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

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

  function refreshList() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function handleRetry() {
    setError(null);
    refreshList();
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product) {
    setEditingId(product.productId);
    setForm({
      productName: product.productName ?? '',
      description: product.description ?? '',
      price: String(product.price ?? ''),
      quantityInStock: String(product.quantityInStock ?? ''),
    });
    setFormError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = {
        productName: form.productName.trim(),
        price: Number(form.price),
        quantityInStock: Number(form.quantityInStock),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      };

      if (editingId) {
        await updateProduct(token, editingId, payload);
        setMessage(`Product #${editingId} updated.`);
      } else {
        await createProduct(token, payload);
        setMessage('Product created.');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      refreshList();
    } catch (err) {
      setFormError(err.message || 'Failed to save the product.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete product "${product.productName}" (#${product.productId})?`);
    if (!confirmed) return;

    setFormError(null);
    setMessage(null);
    setDeletingId(product.productId);
    try {
      await deleteProduct(token, product.productId);
      setMessage(`Product #${product.productId} deleted.`);
      if (editingId === product.productId) cancelEdit();
      refreshList();
    } catch (err) {
      setFormError(err.message || 'Failed to delete the product.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Product admin</h1>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <div className="card">
        <h2>{editingId ? `Edit product #${editingId}` : 'New product'}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="productName">
            Name
            <input
              id="productName"
              type="text"
              value={form.productName}
              onChange={(event) => setField('productName', event.target.value)}
              required
            />
          </label>

          <label htmlFor="description">
            Description (optional)
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </label>

          <label htmlFor="price">
            Price
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(event) => setField('price', event.target.value)}
              required
            />
          </label>

          <label htmlFor="quantityInStock">
            Quantity in stock
            <input
              id="quantityInStock"
              type="number"
              min="1"
              step="1"
              value={form.quantityInStock}
              onChange={(event) => setField('quantityInStock', event.target.value)}
              required
            />
          </label>

          <div className="actions-row">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <h2>Existing products</h2>
      {loading && <Loading message="Loading products..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={handleRetry} />}
      {!loading && !error && products.length === 0 && (
        <EmptyState message="No products registered yet. Create the first one above." />
      )}
      {!loading && !error && products.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>#{product.productId}</td>
                <td>{product.productName}</td>
                <td>$ {formatPrice(product.price)}</td>
                <td>{product.quantityInStock}</td>
                <td>
                  <div className="actions-row">
                    <button type="button" className="btn btn-secondary" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.productId}
                    >
                      {deletingId === product.productId ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function ProductAdminPage() {
  return (
    <RequireAuth>
      <ProductAdminContent />
    </RequireAuth>
  );
}
