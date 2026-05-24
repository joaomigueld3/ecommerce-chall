'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/features/auth/RequireAuth';
import useApiQuery from '@/hooks/useApiQuery';
import { getUser, updateUser } from '@/features/profile/api';
import { useAuth } from '@/features/auth/AuthContext';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';

function ProfileForm() {
  const { user, patchUser } = useAuth();
  const userId = user?.id;
  const { data: profile, loading, error, reload } = useApiQuery(
    () => getUser(userId),
    [userId],
  );
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', email: profile.email || '' });
    }
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim() };
      await updateUser(userId, payload);
      patchUser(payload);
      setFeedback({ type: 'success', text: 'Profile updated.' });
      await reload();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not update the profile.' });
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <ErrorMessage message="No user id found in the current session. Log in again." />;
  }
  if (loading) return <Loading label="Loading profile…" />;
  if (error) return <ErrorMessage message={error.message} onRetry={reload} />;

  return (
    <>
      {feedback && (
        <div className={`alert ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.text}
        </div>
      )}
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Account #{profile?.id} · type: {profile?.type} · email {profile?.confirmed ? 'confirmed' : 'not confirmed'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
      <p className="muted">
        Only name and email can be changed here — that is what the API allows on this endpoint.
      </p>
    </>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <h1>Profile</h1>
      <ProfileForm />
    </RequireAuth>
  );
}
