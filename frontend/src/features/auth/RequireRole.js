'use client';

import Link from 'next/link';
import RequireAuth from './RequireAuth';
import { useAuth } from './AuthContext';

export default function RequireRole({ allowedRoles = ['Admin'], children }) {
  const { user, isReady } = useAuth();

  return (
    <RequireAuth>
      {isReady && !allowedRoles.includes(user?.type) ? (
        <section className="card narrow">
          <h1>Access denied</h1>
          <p className="alert alert-error">
            This area requires {allowedRoles.join(' or ')} permission.
          </p>
          <Link href="/products" className="btn btn-secondary">
            Back to products
          </Link>
        </section>
      ) : (
        children
      )}
    </RequireAuth>
  );
}
