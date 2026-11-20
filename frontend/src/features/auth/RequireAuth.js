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
      const currentPath = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '';
      const target = currentPath && currentPath !== '/' && !currentPath.startsWith('/login')
        ? `/login?next=${encodeURIComponent(currentPath)}`
        : '/login';
      router.replace(target);
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
