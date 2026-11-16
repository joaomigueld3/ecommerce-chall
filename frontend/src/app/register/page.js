'use client';

import { useState } from 'react';
import Link from 'next/link';
import { confirmEmail, register } from '@/features/auth/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedMsg, setConfirmedMsg] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        type: 'Client',
      });
      setCreated(data);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDirectConfirm() {
    if (!created?.confirmationToken) return;
    setError(null);
    setConfirming(true);
    try {
      await confirmEmail(created.confirmationToken);
      setConfirmedMsg('Account confirmed! You can now log in.');
    } catch (err) {
      setError(err.message || 'Could not confirm email.');
    } finally {
      setConfirming(false);
    }
  }

  if (created) {
    return (
      <section className="card narrow">
        <h1>Account created</h1>
        <p className="alert alert-success">
          User <strong>{created.newUser?.email}</strong> registered as {created.newUser?.type}.
        </p>

        {confirmedMsg ? (
          <>
            <p className="alert alert-success">{confirmedMsg}</p>
            <Link href="/login" className="btn">
              Go to Login
            </Link>
          </>
        ) : (
          <div className="stack">
            <p className="muted">
              Portfolio mode (no SMTP server required): confirm your account directly below before signing in.
            </p>
            {error && <p className="alert alert-error">{error}</p>}
            <div className="actions-row">
              <button
                type="button"
                className="btn"
                onClick={handleDirectConfirm}
                disabled={confirming}
              >
                {confirming ? 'Confirming...' : 'Confirm email now'}
              </button>
              {created.confirmationToken && (
                <Link
                  href={`/confirm-email/${created.confirmationToken}`}
                  className="btn btn-secondary"
                >
                  Open confirmation page
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="card narrow">
      <h1>Register</h1>
      <p className="muted">Create a customer account to browse and place orders.</p>

      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="reg-name">
          Name
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label htmlFor="reg-email">
          Email
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label htmlFor="reg-password">
          Password
          <input
            id="reg-password"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <div className="actions-row">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Register'}
          </button>
          <Link href="/login" className="btn btn-secondary">
            Back to login
          </Link>
        </div>
      </form>
    </section>
  );
}
