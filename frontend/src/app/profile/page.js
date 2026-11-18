'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { changePassword, getUserById, updateUser } from '@/features/users/api';
import { createClient, getClients, updateClient } from '@/features/clients/api';
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

  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passError, setPassError] = useState(null);
  const [passMessage, setPassMessage] = useState(null);

  const [clientRecord, setClientRecord] = useState(null);
  const [clientForm, setClientForm] = useState({ fullName: '', contact: '', address: '' });
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientError, setClientError] = useState(null);
  const [clientMessage, setClientMessage] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!userId) {
        setError('Could not determine the logged-in user. Log in again.');
        setLoading(false);
        return;
      }
      try {
        const [userData, clientsData] = await Promise.all([
          getUserById(token, userId),
          getClients(token).catch(() => ({ allClients: [] })),
        ]);
        if (ignore) return;

        setProfile(userData);
        setName(userData?.name ?? '');
        setEmail(userData?.email ?? '');

        const ownClient = (clientsData?.allClients ?? []).find(
          (c) => Number(c.userId) === Number(userId),
        ) || null;
        setClientRecord(ownClient);
        if (ownClient) {
          setClientForm({
            fullName: ownClient.fullName ?? '',
            contact: ownClient.contact ?? '',
            address: ownClient.address ?? '',
          });
        } else {
          setClientForm((curr) => ({
            ...curr,
            fullName: curr.fullName || userData?.name || '',
          }));
        }
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

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPassError(null);
    setPassMessage(null);
    setPassSubmitting(true);
    try {
      await changePassword(token, { email: profile.email, password: newPassword });
      setNewPassword('');
      setPassMessage('Password changed successfully.');
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setPassSubmitting(false);
    }
  }

  async function handleClientSubmit(event) {
    event.preventDefault();
    setClientError(null);
    setClientMessage(null);
    setClientSubmitting(true);
    try {
      const payload = {
        fullName: clientForm.fullName.trim(),
        contact: clientForm.contact.trim(),
        address: clientForm.address.trim(),
        status: true,
      };
      if (clientRecord) {
        await updateClient(token, clientRecord.clientId, payload);
        setClientMessage('Client profile updated.');
      } else {
        await createClient(token, { ...payload, userId });
        setClientMessage('Client profile created.');
      }
      handleRetry();
    } catch (err) {
      setClientError(err.message || 'Failed to save client profile.');
    } finally {
      setClientSubmitting(false);
    }
  }

  if (loading) {
    return <Loading message="Loading profile..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  return (
    <section className="stack">
      <div className="card">
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
      </div>

      <div className="card">
        <h2>Change password</h2>
        {passMessage && <p className="alert alert-success">{passMessage}</p>}
        {passError && <p className="alert alert-error">{passError}</p>}

        <form onSubmit={handlePasswordSubmit} className="form">
          <label htmlFor="new-password">
            New password
            <input
              id="new-password"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn" disabled={passSubmitting}>
            {passSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>{clientRecord ? `Client profile (#${clientRecord.clientId})` : 'Create Client profile'}</h2>
        <p className="muted">Required to place orders at checkout.</p>
        {clientMessage && <p className="alert alert-success">{clientMessage}</p>}
        {clientError && <p className="alert alert-error">{clientError}</p>}

        <form onSubmit={handleClientSubmit} className="form">
          <label htmlFor="client-full-name">
            Full name
            <input
              id="client-full-name"
              type="text"
              value={clientForm.fullName}
              onChange={(event) => setClientForm((c) => ({ ...c, fullName: event.target.value }))}
              required
            />
          </label>

          <label htmlFor="client-contact">
            Contact (phone / identifier)
            <input
              id="client-contact"
              type="text"
              value={clientForm.contact}
              onChange={(event) => setClientForm((c) => ({ ...c, contact: event.target.value }))}
              required
            />
          </label>

          <label htmlFor="client-address">
            Address
            <input
              id="client-address"
              type="text"
              value={clientForm.address}
              onChange={(event) => setClientForm((c) => ({ ...c, address: event.target.value }))}
            />
          </label>

          <button type="submit" className="btn" disabled={clientSubmitting}>
            {clientSubmitting ? 'Saving...' : clientRecord ? 'Update client profile' : 'Create client profile'}
          </button>
        </form>
      </div>
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
