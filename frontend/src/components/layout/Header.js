'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';

export default function Header() {
  const { isAuthenticated, user, ready, logout } = useAuth();
  const { totalQuantity } = useCart();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/products"><strong>Ecommerce Chall</strong></Link>
        <Link href="/products">Products</Link>
        <Link href="/cart">
          Cart {totalQuantity > 0 && <span className="badge">{totalQuantity}</span>}
        </Link>
        <Link href="/checkout">Checkout</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/admin/products">Admin</Link>
        <span className="spacer" />
        {ready && (isAuthenticated ? (
          <>
            <Link href="/profile" style={{ color: '#aab3c5' }}>{user?.email || 'Profile'}</Link>
            <button type="button" className="secondary" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        ))}
      </div>
    </header>
  );
}
