import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StorefrontHomePage from '@/app/page';
import NavBar from '@/components/layout/NavBar';
import Providers from '@/app/providers';
import { getProductCategories, getProducts } from '@/features/products/api';

const mockPush = jest.fn();
const mockRouter = { replace: jest.fn(), push: mockPush, prefetch: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/products/api', () => {
  const actual = jest.requireActual('@/features/products/api');
  return {
    ...actual,
    getProducts: jest.fn(),
    getProductCategories: jest.fn(),
  };
});

describe('Amazon-inspired Storefront Home & NavBar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockClear();
    getProducts.mockReset();
    getProductCategories.mockReset();

    getProductCategories.mockResolvedValue({
      categories: [
        { category: 'Audio', productCount: 2 },
        { category: 'Electronics', productCount: 1 },
      ],
    });
    getProducts.mockResolvedValue({
      items: [
        {
          productId: 4,
          productName: 'Noise Cancelling Headphones',
          category: 'Audio',
          imageUrl: '/images/products/noise-cancelling-headphones.svg',
          price: '499.00',
          quantityInStock: 12,
        },
      ],
      pagination: { page: 1, limit: 4, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    });
  });

  it('renders storefront hero, departments, and deals for unauthenticated visitors', async () => {
    render(
      <Providers>
        <StorefrontHomePage />
      </Providers>,
    );

    expect(screen.getByText(/everything you need, delivered fast/i)).toBeInTheDocument();
    expect(await screen.findByText('Shop by Department')).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
    expect(screen.getAllByText('Noise Cancelling Headphones').length).toBeGreaterThanOrEqual(1);
  });

  it('submits global header search with department filter to /products', async () => {
    render(
      <Providers>
        <NavBar />
      </Providers>,
    );

    await screen.findByRole('option', { name: 'Audio' });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/search department/i), 'Audio');
    await user.type(screen.getByLabelText(/search products/i), 'Headphones');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(mockPush).toHaveBeenCalledWith('/products?productName=Headphones&category=Audio');
  });

  it('switches store region between US ($), Brazil (PT-BR / R$) and Europe (EUR / €) without marketplace branding', async () => {
    render(
      <Providers>
        <NavBar />
        <StorefrontHomePage />
      </Providers>,
    );

    expect(await screen.findByText(/everything you need, delivered fast/i)).toBeInTheDocument();
    expect(screen.queryByText(/marketplace/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    const regionSelect = screen.getByLabelText(/select store region and currency/i);

    await user.selectOptions(regionSelect, 'BR');
    expect(await screen.findByText(/tudo o que você precisa, entregue com agilidade/i)).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*499,00/).length).toBeGreaterThanOrEqual(1);

    await user.selectOptions(regionSelect, 'EU');
    expect(await screen.findByText(/everything you need, delivered fast/i)).toBeInTheDocument();
    expect(screen.getAllByText(/€499\.00|499,00\s*€/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays omni.store brand, renders product images, and toggles light/dark theme', async () => {
    render(
      <Providers>
        <NavBar />
        <StorefrontHomePage />
      </Providers>,
    );

    expect(screen.getByLabelText('omni.store Home')).toBeInTheDocument();
    const images = await screen.findAllByRole('img', { name: 'Noise Cancelling Headphones' });
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0]).toHaveAttribute('src', '/images/products/noise-cancelling-headphones.svg');

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /toggle color theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('ecommerce.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /toggle color theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
