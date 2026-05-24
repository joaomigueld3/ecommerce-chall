'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import Loading from '@/components/ui/Loading';

export default function RequireAuth({ children }) {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return <Loading />;
  }
  if (!isAuthenticated) {
    return <p className="muted">Redirecting to login…</p>;
  }
  return children;
}
