import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductDetailsPage from '@/app/products/[productId]/page';
import CartPage from '@/app/cart/page';
import LoginPage from '@/app/login/page';
import RequireAuth from '@/features/auth/RequireAuth';
import Providers from '@/app/providers';
import {
  getProductById,
  getProductQuestions,
  getProductReviews,
  getRelatedProducts,
} from '@/features/products/api';
import { login as loginRequest } from '@/features/auth/api';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams = { productId: '42' };
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: jest.fn() }),
  useParams: () => mockParams,
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/features/products/api', () => {
  const actual = jest.requireActual('@/features/products/api');
  return {
    ...actual,
    getProductById: jest.fn(),
    getProductReviews: jest.fn(),
    getProductQuestions: jest.fn(),
    getRelatedProducts: jest.fn(),
  };
});

jest.mock('@/features/auth/api', () => ({
  login: jest.fn(),
  refreshAuthToken: jest.fn(),
}));

describe('Phase 1 & Phase 2 storefront detail, guest cart and ?next= auth redirect', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockParams = { productId: '42' };
    mockSearchParams = new URLSearchParams();
    getProductById.mockReset();
    getProductReviews.mockReset();
    getProductQuestions.mockReset();
    getRelatedProducts.mockReset();
    loginRequest.mockReset();
    window.history.replaceState({}, '', '/');

    getProductReviews.mockResolvedValue({
      reviews: [
        {
          reviewId: 1,
          authorName: 'DEMO CLIENT',
          rating: 5,
          title: 'Excellent tactile feel',
          comment: 'Very sturdy keyboard.',
          verifiedPurchase: true,
          helpfulVotes: 2,
          createdAt: '2026-11-20T12:00:00.000Z',
        },
      ],
      summary: { ratingAvg: 5, ratingCount: 1, histogram: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 } },
    });
    getProductQuestions.mockResolvedValue({
      questions: [
        {
          questionId: 1,
          authorName: 'DEMO CLIENT',
          question: 'Is it hot-swappable?',
          answer: 'Yes, 5-pin hot-swap sockets.',
          answeredByName: 'omni.store Team',
          createdAt: '2026-11-20T12:00:00.000Z',
        },
      ],
    });
    getRelatedProducts.mockResolvedValue({ products: [] });
  });

  it('renders public 3-column product page with variants, verified reviews, Q&A and Buy Box', async () => {
    getProductById.mockResolvedValue({
      productId: 42,
      productName: 'Mechanical Keyboard RGB',
      sku: 'OMN-0042',
      category: 'Peripherals',
      description: 'Hot-swap tactile switches',
      price: '299.90',
      originalPrice: '349.90',
      quantityInStock: 8,
      brand: { brandId: 1, name: 'OmniTech' },
      specs: { Switches: 'Tactile Brown' },
      variants: [
        { variantId: 101, sku: 'OMN-42-BLK', name: 'Black', priceOverride: null, quantityInStock: 8 },
        { variantId: 102, sku: 'OMN-42-WHT', name: 'Arctic White', priceOverride: '319.90', quantityInStock: 4 },
      ],
    });

    render(
      <Providers>
        <ProductDetailsPage />
      </Providers>,
    );

    expect(await screen.findByRole('heading', { name: 'Mechanical Keyboard RGB' })).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledWith(null, '42');
    expect(screen.getByText(/in stock \(8 available\)/i)).toBeInTheDocument();
    expect(screen.getByText('Verified Purchase')).toBeInTheDocument();
    expect(screen.getByText(/is it hot-swappable/i)).toBeInTheDocument();
    expect(screen.getByText('Tactile Brown')).toBeInTheDocument();

    const user = userEvent.setup();
    const qtyInput = screen.getByLabelText(/quantity/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');

    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(await screen.findByText(/added 2 unit\(s\) to cart/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /buy now/i }));
    expect(mockPush).toHaveBeenCalledWith('/checkout');

    const storedCart = JSON.parse(window.localStorage.getItem('ecommerce.cart'));
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0].productId).toBe(42);
    expect(storedCart[0].quantity).toBe(4);
  });

  it('allows guests to view their cart and displays a sign-in-at-checkout notice', async () => {
    window.localStorage.setItem('ecommerce.cart', JSON.stringify([
      { productId: 42, productName: 'Mechanical Keyboard RGB', price: 299.9, quantity: 2 },
    ]));

    render(
      <Providers>
        <CartPage />
      </Providers>,
    );

    expect(await screen.findByText('Mechanical Keyboard RGB')).toBeInTheDocument();
    expect(screen.getByText(/you are shopping as a guest/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /proceed to checkout/i })).toHaveAttribute('href', '/checkout');
  });

  it('preserves /checkout via ?next= on RequireAuth and redirects back after login', async () => {
    window.history.replaceState({}, '', '/checkout');

    render(
      <Providers>
        <RequireAuth>
          <p>checkout form</p>
        </RequireAuth>
      </Providers>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Fcheckout');
    });

    mockSearchParams = new URLSearchParams('next=/checkout');
    loginRequest.mockResolvedValue({
      token: 'jwt-client',
      refreshToken: 'ref-client',
      user: { id: 2, name: 'DEMO CLIENT', email: 'client@loomi.dev', type: 'Client' },
    });

    render(
      <Providers>
        <LoginPage />
      </Providers>,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'client@loomi.dev');
    await user.type(screen.getByLabelText(/password/i), 'Client@1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/checkout');
    });
  });
});
