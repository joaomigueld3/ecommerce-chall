'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';

function getSafeNextPath(raw) {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/';
}

function LoginFormContent() {
  const { login, isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed') === '1';
  const nextPath = getSafeNextPath(searchParams.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isReady, isAuthenticated, nextPath, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(nextPath);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card narrow">
      <h1>Sign in</h1>
      <p className="muted">Use a confirmed user account to continue.</p>

      {confirmed && (
        <p className="alert alert-success">Email confirmed! You can now sign in.</p>
      )}
      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>

        <div className="actions-row">
          <button type="submit" className="btn amz-btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
          <Link href="/register" className="btn btn-secondary">
            Create account
          </Link>
        </div>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="card narrow"><h1>Sign in</h1></section>}>
      <LoginFormContent />
    </Suspense>
  );
}
