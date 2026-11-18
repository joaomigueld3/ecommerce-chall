'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { confirmEmail } from '@/features/auth/api';
import Loading from '@/components/ui/Loading';

export default function ConfirmEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const res = await confirmEmail(token);
        if (ignore) return;
        setStatus('success');
        setMessage(res?.message || 'Email confirmed successfully.');
      } catch (err) {
        if (ignore) return;
        setStatus('error');
        setMessage(err.message || 'Invalid or expired confirmation token.');
      }
    }

    if (token) run();
    return () => {
      ignore = true;
    };
  }, [token]);

  if (status === 'loading') {
    return <Loading message="Confirming email..." />;
  }

  return (
    <section className="card narrow">
      <h1>Email confirmation</h1>
      <p className={`alert ${status === 'success' ? 'alert-success' : 'alert-error'}`}>
        {message}
      </p>
      <Link href="/login" className="btn">
        Go to Login
      </Link>
    </section>
  );
}
