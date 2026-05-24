import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from '@/app/products/page';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CartProvider } from '@/features/cart/CartContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

const PRODUCTS = [
  {
    productId: 1, productName: 'Keyboard', description: 'Mechanical', price: '199.90', quantityInStock: 5,
  },
  {
    productId: 2, productName: 'Mouse', description: '', price: '89.90', quantityInStock: 0,
  },
];

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function renderProductsPage() {
  return render(
    <AuthProvider>
      <CartProvider>
        <ProductsPage />
      </CartProvider>
    </AuthProvider>,
  );
}

describe('Products page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('token', 'a-token');
    window.localStorage.setItem('user', JSON.stringify({ id: 1, email: 'a@b.c' }));
    global.fetch = jest.fn();
  });

  it('loads and renders the product list, disabling out-of-stock items', async () => {
    global.fetch.mockImplementation(() => jsonResponse(PRODUCTS));

    renderProductsPage();

    expect(await screen.findByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText('Mouse')).toBeInTheDocument();
    expect(screen.getByText('R$ 199.90')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /add to cart/i });
    expect(buttons).toHaveLength(2);
    expect(buttons[1]).toBeDisabled();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/products$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a-token' }),
      }),
    );
  });

  it('adds a product to the cart and reflects it in the button label', async () => {
    global.fetch.mockImplementation(() => jsonResponse(PRODUCTS));
    const user = userEvent.setup();

    renderProductsPage();

    const addButton = (await screen.findAllByRole('button', { name: /add to cart/i }))[0];
    await user.click(addButton);

    expect(await screen.findByRole('button', { name: /add another \(1 in cart\)/i })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cart'))).toHaveLength(1);
  });

  it('shows the API error and recovers after a retry', async () => {
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ success: false, message: 'boom' }, 500))
      .mockImplementation(() => jsonResponse(PRODUCTS));
    const user = userEvent.setup();

    renderProductsPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Keyboard')).toBeInTheDocument();
  });
});
