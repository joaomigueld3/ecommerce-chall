'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import { createUser, deleteUser, getUsers, updateUser } from '@/features/users/api';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  type: 'Client',
  confirmed: true,
};

function UsersAdminContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState({ name: '', email: '', type: '' });
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
          ? await getUsers(token, appliedFilters)
          : await getUsers(token);
        if (ignore) return;
        setUsers(data?.allUsers ?? []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load users.');
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

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      name: u.name ?? '',
      email: u.email ?? '',
      password: '',
      type: u.type ?? 'Client',
      confirmed: Boolean(u.confirmed),
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
      if (editingId) {
        await updateUser(token, editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          type: form.type,
          confirmed: Boolean(form.confirmed),
        });
        setMessage(`User #${editingId} updated.`);
      } else {
        await createUser(token, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          type: form.type,
          confirmed: Boolean(form.confirmed),
        });
        setMessage('User created.');
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.email}" (#${u.id})?`)) return;
    setFormError(null);
    setMessage(null);
    try {
      await deleteUser(token, u.id);
      setMessage(`User #${u.id} deleted.`);
      if (editingId === u.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to delete user.');
    }
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    const next = {};
    if (search.name.trim()) next.name = search.name.trim();
    if (search.email.trim()) next.email = search.email.trim();
    if (search.type) next.type = search.type;
    setLoading(true);
    setAppliedFilters(Object.keys(next).length ? next : null);
  }

  return (
    <section className="stack">
      <h1>Users admin</h1>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <div className="card">
        <h2>{editingId ? `Edit user #${editingId}` : 'New user'}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="u-name">
            Name
            <input
              id="u-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
          </label>
          <label htmlFor="u-email">
            Email
            <input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              required
            />
          </label>
          {!editingId && (
            <label htmlFor="u-pass">
              Password
              <input
                id="u-pass"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                required
              />
            </label>
          )}
          <label htmlFor="u-type">
            Role
            <select
              id="u-type"
              value={form.type}
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
            >
              <option value="Client">Client</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <label htmlFor="u-confirmed" className="checkbox-label">
            <input
              id="u-confirmed"
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => setForm((c) => ({ ...c, confirmed: e.target.checked }))}
            />
            Confirmed
          </label>
          <div className="actions-row">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create user'}
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
        <label htmlFor="fu-name">
          Name
          <input
            id="fu-name"
            type="text"
            value={search.name}
            onChange={(e) => setSearch((c) => ({ ...c, name: e.target.value }))}
          />
        </label>
        <label htmlFor="fu-email">
          Email
          <input
            id="fu-email"
            type="text"
            value={search.email}
            onChange={(e) => setSearch((c) => ({ ...c, email: e.target.value }))}
          />
        </label>
        <label htmlFor="fu-type">
          Role
          <select
            id="fu-type"
            value={search.type}
            onChange={(e) => setSearch((c) => ({ ...c, type: e.target.value }))}
          >
            <option value="">All</option>
            <option value="Client">Client</option>
            <option value="Admin">Admin</option>
          </select>
        </label>
        <div className="actions-row">
          <button type="submit" className="btn">Filter</button>
          {appliedFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch({ name: '', email: '', type: '' });
                setLoading(true);
                setAppliedFilters(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && <Loading message="Loading users..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && users.length === 0 && (
        <EmptyState message="No users found." />
      )}
      {!loading && !error && users.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Confirmed</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.type}</td>
                <td>{u.confirmed ? 'Yes' : 'No'}</td>
                <td>
                  <div className="actions-row">
                    <button type="button" className="btn btn-secondary" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(u)}>
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

export default function UsersAdminPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <UsersAdminContent />
    </RequireRole>
  );
}
