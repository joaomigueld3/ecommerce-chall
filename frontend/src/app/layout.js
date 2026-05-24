import './globals.css';
import Providers from './providers';
import NavBar from '@/components/layout/NavBar';

export const metadata = {
  title: 'Ecommerce Chall',
  description: 'Frontend for the ecommerce-chall API',
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
