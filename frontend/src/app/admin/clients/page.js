'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import { createClient, deleteClient, getClients, updateClient } from '@/features/clients/api';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const EMPTY_FORM = {
  fullName: '',
  contact: '',
  address: '',
  userId: '',
  status: true,
};

function ClientAdminContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState({ fullName: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = appliedFilters
          ? await getClients(token, appliedFilters)
          : await getClients(token);
        if (ignore) return;
        setClients(data?.allClients ?? []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load clients.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, appliedFilters, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function startEdit(client) {
    setEditingId(client.clientId);
    setForm({
      fullName: client.fullName ?? '',
      contact: client.contact ?? '',
      address: client.address ?? '',
      userId: client.userId ? String(client.userId) : '',
      status: Boolean(client.status),
    });
    setFormError(null);
    setMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        contact: form.contact.trim(),
        address: form.address.trim(),
        status: Boolean(form.status),
        ...(form.userId ? { userId: Number(form.userId) } : {}),
      };

      if (editingId) {
        await updateClient(token, editingId, payload);
        setMessage(`Client #${editingId} updated.`);
      } else {
        await createClient(token, payload);
        setMessage('Client created.');
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to save client.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(client) {
    if (!window.confirm(`Delete client "${client.fullName}" (#${client.clientId})?`)) return;
    setFormError(null);
    setMessage(null);
    try {
      await deleteClient(token, client.clientId);
      setMessage(`Client #${client.clientId} deleted.`);
      if (editingId === client.clientId) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to delete client.');
    }
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    const next = {};
    if (search.fullName.trim()) next.fullName = search.fullName.trim();
    if (search.status !== '') next.status = search.status;
    setLoading(true);
    setAppliedFilters(Object.keys(next).length ? next : null);
  }

  return (
    <section className="stack">
      <h1>Clients admin</h1>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <div className="card">
        <h2>{editingId ? `Edit client #${editingId}` : 'New client'}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="c-name">
            Full name
            <input
              id="c-name"
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
              required
            />
          </label>
          <label htmlFor="c-contact">
            Contact
            <input
              id="c-contact"
              type="text"
              value={form.contact}
              onChange={(e) => setForm((c) => ({ ...c, contact: e.target.value }))}
              required
            />
          </label>
          <label htmlFor="c-address">
            Address
            <input
              id="c-address"
              type="text"
              value={form.address}
              onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
            />
          </label>
          <label htmlFor="c-user">
            Linked User ID (optional)
            <input
              id="c-user"
              type="number"
              min="1"
              value={form.userId}
              onChange={(e) => setForm((c) => ({ ...c, userId: e.target.value }))}
            />
          </label>
          <label htmlFor="c-status" className="checkbox-label">
            <input
              id="c-status"
              type="checkbox"
              checked={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.checked }))}
            />
            Active
          </label>
          <div className="actions-row">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create client'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <form onSubmit={handleFilterSubmit} className="filters-bar">
        <label htmlFor="filter-client-name">
          Name
          <input
            id="filter-client-name"
            type="text"
            value={search.fullName}
            onChange={(e) => setSearch((c) => ({ ...c, fullName: e.target.value }))}
          />
        </label>
        <label htmlFor="filter-client-status">
          Status
          <select
            id="filter-client-status"
            value={search.status}
            onChange={(e) => setSearch((c) => ({ ...c, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <div className="actions-row">
          <button type="submit" className="btn">Filter</button>
          {appliedFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch({ fullName: '', status: '' });
                setLoading(true);
                setAppliedFilters(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && <Loading message="Loading clients..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && clients.length === 0 && (
        <EmptyState message="No clients found." />
      )}
      {!loading && !error && clients.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Contact</th>
              <th>User</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.clientId}>
                <td>#{client.clientId}</td>
                <td>{client.fullName}</td>
                <td>{client.contact}</td>
                <td>{client.userId ? `#${client.userId}` : '—'}</td>
                <td>{client.status ? 'Active' : 'Inactive'}</td>
                <td>
                  <div className="actions-row">
                    <button type="button" className="btn btn-secondary" onClick={() => startEdit(client)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(client)}>
                      Delete
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

export default function ClientAdminPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <ClientAdminContent />
    </RequireRole>
  );
}
