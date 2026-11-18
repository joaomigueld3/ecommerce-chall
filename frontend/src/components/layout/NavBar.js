'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';

export default function NavBar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="navbar">
      <Link href="/products" className="brand">
        Ecommerce Store
      </Link>
      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            <Link href="/products">Products</Link>
            <Link href="/cart">Cart ({totalItems})</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/orders">Orders</Link>
            <Link href="/profile">Profile</Link>
            {isAdmin && (
              <>
                <Link href="/admin/products">Admin Products</Link>
                <Link href="/admin/clients">Clients</Link>
                <Link href="/admin/users">Users</Link>
                <Link href="/admin/reports">Reports</Link>
              </>
            )}
            {user?.email && <span className="muted">{user.email}</span>}
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
