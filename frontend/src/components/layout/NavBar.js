'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';

export default function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="navbar">
      <Link href="/products" className="brand">
        Ecommerce Chall
      </Link>
      <nav className="nav-links">
        <Link href="/products">Products</Link>
        <Link href="/cart">Cart ({totalItems})</Link>
        <Link href="/checkout">Checkout</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/admin/products">Admin</Link>
        <Link href="/profile">Profile</Link>
        {isAuthenticated ? (
          <>
            {user?.email && <span className="muted">{user.email}</span>}
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
