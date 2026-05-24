'use client';

import { useState } from 'react';
import RequireAuth from '@/features/auth/RequireAuth';
import useApiQuery from '@/hooks/useApiQuery';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
} from '@/features/products/api';
import { formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const EMPTY_FORM = {
  productName: '', description: '', price: '', quantityInStock: '',
};

function buildPayload(form) {
  const payload = {
    productName: form.productName.trim(),
    price: Number(form.price),
    quantityInStock: Number(form.quantityInStock),
  };
  if (form.description.trim()) payload.description = form.description.trim();
  return payload;
}

function ProductAdmin() {
  const { data: products, loading, error, reload } = useApiQuery(getProducts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(product) {
    setEditingId(product.productId);
    setForm({
      productName: product.productName || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      quantityInStock: String(product.quantityInStock ?? ''),
    });
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editingId) {
        await updateProduct(editingId, buildPayload(form));
        setFeedback({ type: 'success', text: `Product #${editingId} updated.` });
      } else {
        const result = await createProduct(buildPayload(form));
        setFeedback({ type: 'success', text: `Product "${result?.product?.productName ?? form.productName}" created.` });
      }
      cancelEdit();
      await reload();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not save the product.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${product.productName}" (#${product.productId})?`)) return;
    setDeletingId(product.productId);
    setFeedback(null);
    try {
      await deleteProduct(product.productId);
      if (editingId === product.productId) cancelEdit();
      setFeedback({ type: 'success', text: `Product #${product.productId} deleted.` });
      await reload();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not delete the product.' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {feedback && (
        <div className={`alert ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.text}
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>{editingId ? `Edit product #${editingId}` : 'New product'}</h2>
        <div className="field">
          <label htmlFor="productName">Name</label>
          <input
            id="productName"
            value={form.productName}
            onChange={(e) => setField('productName', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <input
            id="description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>
        <div className="row">
          <div className="field grow">
            <label htmlFor="price">Price</label>
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              required
            />
          </div>
          <div className="field grow">
            <label htmlFor="quantityInStock">Quantity in stock</label>
            <input
              id="quantityInStock"
              type="number"
              min="1"
              step="1"
              value={form.quantityInStock}
              onChange={(e) => setField('quantityInStock', e.target.value)}
              required
            />
          </div>
        </div>
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={cancelEdit} disabled={saving}>
              Cancel edit
            </button>
          )}
        </div>
        <p className="muted">The API requires price and stock to be greater than zero.</p>
      </form>

      <h2>Catalogue</h2>
      {loading && <Loading label="Loading products…" />}
      {!loading && error && <ErrorMessage message={error.message} onRetry={reload} />}
      {!loading && !error && (!products || products.length === 0) && (
        <EmptyState message="No products yet. Create the first one above." />
      )}
      {!loading && !error && products && products.map((product) => (
        <div className="card row" key={product.productId}>
          <div className="grow">
            <strong>#{product.productId} — {product.productName}</strong>
            {product.description && <p className="muted">{product.description}</p>}
            <span className="muted">{product.quantityInStock} in stock</span>
          </div>
          <span className="price">{formatPrice(product.price)}</span>
          <button type="button" className="secondary" onClick={() => startEdit(product)}>
            Edit
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => handleDelete(product)}
            disabled={deletingId === product.productId}
          >
            {deletingId === product.productId ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ))}
    </>
  );
}

export default function ProductAdminPage() {
  return (
    <RequireAuth>
      <h1>Product admin</h1>
      <ProductAdmin />
    </RequireAuth>
  );
}
