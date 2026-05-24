import './globals.css';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CartProvider } from '@/features/cart/CartContext';
import Header from '@/components/layout/Header';

export const metadata = {
  title: 'Ecommerce Chall',
  description: 'Storefront for the ecommerce-chall API',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="container">{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
