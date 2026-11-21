'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useStore } from '@/features/store/StoreContext';
import { getProductCategories } from '@/features/products/api';

function getFirstName(user) {
  if (!user) return null;
  if (user.name && typeof user.name === 'string') {
    const first = user.name.trim().split(/\s+/)[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'Account';
}

export default function NavBar() {
  const { isAuthenticated, isAdmin, user, token, logout } = useAuth();
  const { totalItems } = useCart();
  const { brand, storeName, region, regions, setRegion, theme, toggleTheme, t } = useStore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      try {
        const data = await getProductCategories(token);
        if (ignore) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (!ignore) setCategories([]);
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, [token]);

  function handleSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('productName', searchQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  }

  function handleLogout() {
    logout();
    router.replace('/');
  }

  const firstName = getFirstName(user);

  return (
    <header className="amz-header">
      <div className="amz-header-top">
        <Link href="/" className="amz-brand" aria-label={`${storeName} Home`}>
          <span className="amz-brand-name">{brand.shortPrefix}</span>
          <span className="amz-brand-suffix">{brand.shortSuffix}</span>
        </Link>

        <form onSubmit={handleSearch} className="amz-search-form" role="search" aria-label="Search store">
          <select
            aria-label="Search department"
            className="amz-search-select"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="">{t.allDepartments}</option>
            {categories.map((entry) => (
              <option key={entry.category} value={entry.category}>
                {entry.category}
              </option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Search products"
            className="amz-search-input"
            placeholder={t.searchPlaceholder(storeName)}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit" className="amz-search-btn">
            {t.searchButton}
          </button>
        </form>

        <div className="amz-header-actions">
          <button
            type="button"
            className="amz-theme-btn"
            aria-label={t.toggleThemeAria}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? `☀ ${t.lightThemeLabel}` : `☾ ${t.darkThemeLabel}`}
          </button>

          <select
            aria-label={t.regionAria}
            className="amz-region-select"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            {regions.map((preset) => (
              <option key={preset.code} value={preset.code}>
                {preset.shortLabel}
              </option>
            ))}
          </select>

          {isAuthenticated ? (
            <>
              <Link href="/profile" className="amz-nav-item">
                <span className="amz-nav-label">{t.helloUser(firstName)}</span>
                <strong className="amz-nav-strong">{t.accountProfile}</strong>
              </Link>
              <Link href="/orders" className="amz-nav-item">
                <span className="amz-nav-label">{t.returns}</span>
                <strong className="amz-nav-strong">{t.andOrders}</strong>
              </Link>
              <button type="button" className="amz-signout-btn" onClick={handleLogout}>
                {t.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="amz-nav-item">
                <span className="amz-nav-label">{t.helloSignIn}</span>
                <strong className="amz-nav-strong">{t.account}</strong>
              </Link>
              <Link href="/register" className="amz-nav-item">
                <span className="amz-nav-label">{t.newHere}</span>
                <strong className="amz-nav-strong">{t.register}</strong>
              </Link>
            </>
          )}

          <Link href="/cart" className="amz-cart-link" aria-label={`Cart with ${totalItems} items`}>
            <span className="amz-cart-count">{totalItems}</span>
            <strong className="amz-nav-strong">{t.cart}</strong>
          </Link>
        </div>
      </div>

      <nav className="amz-header-sub" aria-label="Departments and shortcuts">
        <div className="amz-sub-group">
          <Link href="/">
            {t.home}
          </Link>
          <Link href="/products">{t.allProducts}</Link>
          <Link href="/products?sortBy=price&sortOrder=asc&available=true">{t.bestDeals}</Link>
          <Link href="/products?available=true">{t.inStock}</Link>
          {isAuthenticated && <Link href="/wishlist">Wishlist</Link>}
          {categories.slice(0, 5).map((entry) => (
            <Link
              key={entry.category}
              href={`/products?category=${encodeURIComponent(entry.category)}`}
            >
              {entry.category}
            </Link>
          ))}
        </div>

        {isAdmin && (
          <div className="amz-sub-group amz-admin-strip">
            <span className="amz-admin-tag">{t.adminTag}</span>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/inventory">Inventory</Link>
            <Link href="/admin/reviews">Reviews</Link>
            <Link href="/admin/clients">Clients</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/reports">Reports</Link>
            <Link href="/admin/settings">Settings</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
