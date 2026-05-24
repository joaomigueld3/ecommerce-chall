'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { getUserById, updateUser } from '@/features/users/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';

function ProfileContent() {
  const { token, user, logout, updateStoredUser } = useAuth();
  const router = useRouter();
  const userId = user?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!userId) {
        setError('Could not determine the logged-in user. Log in again.');
        setLoading(false);
        return;
      }
      try {
        const data = await getUserById(token, userId);
        if (ignore) return;
        setProfile(data);
        setName(data?.name ?? '');
        setEmail(data?.email ?? '');
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load your profile.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, userId, reloadKey, logout, router]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), email: email.trim() };
      await updateUser(token, userId, payload);
      updateStoredUser(payload);
      setMessage('Profile updated successfully.');
      handleRetry();
    } catch (err) {
      setFormError(err.message || 'Failed to update your profile.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading message="Loading profile..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  return (
    <section className="card narrow">
      <h1>Profile</h1>

      <ul className="summary-list">
        <li>
          <strong>Id:</strong> #{profile?.id}
        </li>
        <li>
          <strong>Type:</strong> {profile?.type}
        </li>
        <li>
          <strong>Email confirmed:</strong> {profile?.confirmed ? 'Yes' : 'No'}
        </li>
        <li>
          <strong>Member since:</strong> {formatDate(profile?.createdAt)}
        </li>
      </ul>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="name">
          Name
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
