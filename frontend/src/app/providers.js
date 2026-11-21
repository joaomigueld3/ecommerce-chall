'use client';

import { StoreProvider } from '@/features/store/StoreContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CartProvider } from '@/features/cart/CartContext';

export default function Providers({ children }) {
  return (
    <StoreProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
