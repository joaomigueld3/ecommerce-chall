'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/ui/Loading';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading message="Redirecting to login..." />;
  }

  return children;
}
