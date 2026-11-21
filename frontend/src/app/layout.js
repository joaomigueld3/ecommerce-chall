import './globals.css';
import Providers from './providers';
import NavBar from '@/components/layout/NavBar';
import { STORE_BRAND } from '@/lib/store-config';

export const metadata = {
  title: `${STORE_BRAND.name} — Online Store`,
  description: 'White-label single-store ecommerce platform (BR / US / EU) and backoffice',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main className="container">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
