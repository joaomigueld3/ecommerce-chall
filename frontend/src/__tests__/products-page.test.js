import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from '@/app/products/page';
import Providers from '@/app/providers';
import { getProductCategories, getProducts } from '@/features/products/api';

const mockRouter = { replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() };
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/features/products/api', () => {
  const actual = jest.requireActual('@/features/products/api');
  return {
    ...actual,
    getProducts: jest.fn(),
    getProductCategories: jest.fn(),
  };
});

function renderProductsPage() {
  return render(
    <Providers>
      <ProductsPage />
    </Providers>,
  );
}

describe('Products page (public storefront + mocked API)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getProducts.mockReset();
    getProductCategories.mockReset();
    getProductCategories.mockResolvedValue({
      categories: [
        { category: 'Peripherals', productCount: 2 },
        { category: 'Audio', productCount: 1 },
      ],
    });
  });

  it('allows guests to browse products, see stock states, and add an item to the cart', async () => {
    getProducts.mockResolvedValue({
      items: [
        { productId: 1, productName: 'Mouse Gamer', category: 'Peripherals', price: '99.90', quantityInStock: 5 },
        { productId: 2, productName: 'Teclado Mecanico', category: 'Peripherals', price: '59.90', quantityInStock: 0 },
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    renderProductsPage();

    expect(await screen.findByText('Mouse Gamer')).toBeInTheDocument();
    expect(screen.getByText('Teclado Mecanico')).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledWith(null, expect.objectContaining({
      page: 1,
      limit: 12,
      sortBy: 'productId',
      sortOrder: 'desc',
    }));

    const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
    expect(addButtons).toHaveLength(2);
    expect(addButtons[1]).toBeDisabled();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(addButtons[0]);
    expect(await screen.findByText(/1 in cart/)).toBeInTheDocument();
  });

  it('supports sorting and paginating results through API params', async () => {
    getProducts
      .mockResolvedValueOnce({
        items: [
          { productId: 10, productName: 'Item Page 1', category: 'Audio', price: '120.00', quantityInStock: 4 },
        ],
        pagination: {
          page: 1,
          limit: 12,
          total: 24,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        },
      })
      .mockResolvedValueOnce({
        items: [
          { productId: 11, productName: 'Item Page 2', category: 'Audio', price: '80.00', quantityInStock: 3 },
        ],
        pagination: {
          page: 2,
          limit: 12,
          total: 24,
          totalPages: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });

    renderProductsPage();

    expect(await screen.findByText('Item Page 1')).toBeInTheDocument();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Item Page 2')).toBeInTheDocument();
    expect(getProducts).toHaveBeenLastCalledWith(null, expect.objectContaining({ page: 2, limit: 12 }));
  });

  it('shows an error state with retry, then the empty state when the API recovers', async () => {
    getProducts
      .mockRejectedValueOnce(Object.assign(new Error('Could not reach the API. Is the backend running?'), { status: 0 }))
      .mockResolvedValueOnce({
        items: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      });

    renderProductsPage();

    expect(await screen.findByText(/could not reach the api/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText(/no products registered/i)).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(2);
  });
});
