'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createProduct,
  deleteProduct,
  getBrands,
  getProducts,
  normalizeProductsResponse,
  updateProduct,
} from '@/features/products/api';
import { useStore } from '@/features/store/StoreContext';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import ProductImage from '@/components/ui/ProductImage';

const EMPTY_FORM = {
  productName: '',
  sku: '',
  description: '',
  category: 'General',
  brandId: '',
  imageUrl: '',
  price: '',
  originalPrice: '',
  costPrice: '',
  quantityInStock: '',
  minStockLevel: '5',
  featured: false,
  isDealOfDay: false,
  active: true,
};

function ProductAdminContent() {
  const { token, logout } = useAuth();
  const { formatMoney } = useStore();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
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
        const [data, brandsRes] = await Promise.all([
          getProducts(token, { includeInactive: true }),
          getBrands(token).catch(() => ({ brands: [] })),
        ]);
        if (ignore) return;
        setProducts(normalizeProductsResponse(data).items);
        setBrands(Array.isArray(brandsRes?.brands) ? brandsRes.brands : []);
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

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product) {
    setEditingId(product.productId);
    setForm({
      productName: product.productName ?? '',
      sku: product.sku ?? '',
      description: product.description ?? '',
      category: product.category ?? 'General',
      brandId: product.brandId ? String(product.brandId) : '',
      imageUrl: product.imageUrl ?? '',
      price: String(product.price ?? ''),
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      costPrice: product.costPrice ? String(product.costPrice) : '',
      quantityInStock: String(product.quantityInStock ?? ''),
      minStockLevel: String(product.minStockLevel ?? 5),
      featured: Boolean(product.featured),
      isDealOfDay: Boolean(product.isDealOfDay),
      active: product.active !== false,
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
        category: form.category.trim() || 'General',
        price: Number(form.price),
        quantityInStock: Number(form.quantityInStock),
        minStockLevel: Number(form.minStockLevel || 5),
        featured: Boolean(form.featured),
        isDealOfDay: Boolean(form.isDealOfDay),
        active: Boolean(form.active),
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        ...(form.brandId ? { brandId: Number(form.brandId) } : { brandId: null }),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
        ...(form.originalPrice !== '' ? { originalPrice: Number(form.originalPrice) } : { originalPrice: null }),
        ...(form.costPrice !== '' ? { costPrice: Number(form.costPrice) } : { costPrice: null }),
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
    const confirmed = window.confirm(
      `Delete or archive product "${product.productName}" (#${product.productId})?`,
    );
    if (!confirmed) return;

    setFormError(null);
    setMessage(null);
    setDeletingId(product.productId);
    try {
      const res = await deleteProduct(token, product.productId);
      setMessage(res?.message || `Product #${product.productId} deleted.`);
      if (editingId === product.productId) cancelEdit();
      refreshList();
    } catch (err) {
      setFormError(err.message || 'Failed to delete the product.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Product Catalog Admin</h1>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <div className="card">
        <h2>{editingId ? `Edit product #${editingId}` : 'New product'}</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid-2">
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

            <label htmlFor="sku">
              SKU (optional)
              <input
                id="sku"
                type="text"
                placeholder="OMN-0051"
                value={form.sku}
                onChange={(event) => setField('sku', event.target.value)}
              />
            </label>

            <label htmlFor="category">
              Category
              <input
                id="category"
                type="text"
                value={form.category}
                onChange={(event) => setField('category', event.target.value)}
                required
              />
            </label>

            <label htmlFor="brandId">
              Brand
              <select
                id="brandId"
                value={form.brandId}
                onChange={(event) => setField('brandId', event.target.value)}
              >
                <option value="">No brand</option>
                {brands.map((b) => (
                  <option key={b.brandId} value={b.brandId}>{b.name}</option>
                ))}
              </select>
            </label>

            <label htmlFor="price">
              Sale Price
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

            <label htmlFor="originalPrice">
              Original Price (Was, optional)
              <input
                id="originalPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={form.originalPrice}
                onChange={(event) => setField('originalPrice', event.target.value)}
              />
            </label>

            <label htmlFor="costPrice">
              Cost Price (internal, optional)
              <input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(event) => setField('costPrice', event.target.value)}
              />
            </label>

            <label htmlFor="quantityInStock">
              Quantity in stock
              <input
                id="quantityInStock"
                type="number"
                min="0"
                step="1"
                value={form.quantityInStock}
                onChange={(event) => setField('quantityInStock', event.target.value)}
                required
              />
            </label>

            <label htmlFor="minStockLevel">
              Min stock alert level
              <input
                id="minStockLevel"
                type="number"
                min="0"
                step="1"
                value={form.minStockLevel}
                onChange={(event) => setField('minStockLevel', event.target.value)}
              />
            </label>

            <label htmlFor="imageUrl">
              Image URL (optional)
              <input
                id="imageUrl"
                type="text"
                placeholder="/images/products/my-product.webp or https://..."
                value={form.imageUrl}
                onChange={(event) => setField('imageUrl', event.target.value)}
              />
            </label>
          </div>

          <label htmlFor="description">
            Description (optional)
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </label>

          <div className="actions-row">
            <label htmlFor="featured" className="checkbox-label">
              <input
                id="featured"
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField('featured', e.target.checked)}
              />
              Featured
            </label>
            <label htmlFor="isDealOfDay" className="checkbox-label">
              <input
                id="isDealOfDay"
                type="checkbox"
                checked={form.isDealOfDay}
                onChange={(e) => setField('isDealOfDay', e.target.checked)}
              />
              Deal of the Day
            </label>
            <label htmlFor="active" className="checkbox-label">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField('active', e.target.checked)}
              />
              Active in storefront
            </label>
          </div>

          <div className="actions-row">
            <button type="submit" className="btn amz-btn-primary" disabled={submitting}>
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

      <h2>Catalog products ({products.length})</h2>
      {loading && <Loading message="Loading products..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={refreshList} />}
      {!loading && !error && products.length === 0 && (
        <EmptyState message="No products registered yet. Create the first one above." />
      )}
      {!loading && !error && products.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>{product.sku || `#${product.productId}`}</td>
                <td>
                  <ProductImage product={product} variant="thumb" />
                </td>
                <td>{product.productName}</td>
                <td>{product.category || 'General'}</td>
                <td>{formatMoney(product.price)}</td>
                <td className={Number(product.quantityInStock) <= Number(product.minStockLevel ?? 5) ? 'stock-out' : ''}>
                  {product.quantityInStock}
                </td>
                <td>
                  <span className="badge">{product.active === false ? 'Archived' : 'Active'}</span>
                </td>
                <td>
                  <div className="actions-row">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.productId}
                    >
                      {deletingId === product.productId ? 'Removing...' : 'Delete'}
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
    <RequireRole allowedRoles={['Admin']}>
      <ProductAdminContent />
    </RequireRole>
  );
}
