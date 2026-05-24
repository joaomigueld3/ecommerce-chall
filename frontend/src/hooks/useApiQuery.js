'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * Runs an async API call on mount (and whenever `deps` change) and exposes
 * { data, loading, error, reload }. A 401 clears the session and redirects to /login.
 */
export default function useApiQuery(queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { logout } = useAuth();
  const router = useRouter();
  const queryRef = useRef(queryFn);
  queryRef.current = queryFn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryRef.current();
      setData(result);
    } catch (err) {
      if (err.status === 401) {
        logout();
        router.replace('/login');
        return;
      }
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout, router, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
