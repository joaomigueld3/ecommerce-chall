import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from '@/app/products/page';
import Providers from '@/app/providers';
import { getProducts } from '@/features/products/api';

const mockRouter = { replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/products/api', () => ({
  getProducts: jest.fn(),
}));

function renderProductsPage() {
  return render(
    <Providers>
      <ProductsPage />
    </Providers>,
  );
}

describe('Products page (mocked API)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('ecommerce.token', 'fake-token');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 1, email: 'admin@test.local' }));
    getProducts.mockReset();
  });

  it('loads products with the stored token and adds an item to the cart', async () => {
    getProducts.mockResolvedValue([
      { productId: 1, productName: 'Mouse Gamer', price: '99.90', quantityInStock: 5 },
      { productId: 2, productName: 'Teclado Mecanico', price: '59.90', quantityInStock: 0 },
    ]);

    renderProductsPage();

    expect(await screen.findByText('Mouse Gamer')).toBeInTheDocument();
    expect(screen.getByText('Teclado Mecanico')).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledWith('fake-token');

    const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
    expect(addButtons).toHaveLength(2);
    expect(addButtons[1]).toBeDisabled();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(addButtons[0]);
    expect(await screen.findByText(/1 in cart/)).toBeInTheDocument();
  });

  it('shows an error state with retry, then the empty state when the API recovers', async () => {
    getProducts
      .mockRejectedValueOnce(Object.assign(new Error('Could not reach the API. Is the backend running?'), { status: 0 }))
      .mockResolvedValueOnce([]);

    renderProductsPage();

    expect(await screen.findByText(/could not reach the api/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText(/no products registered/i)).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(2);
  });
});
