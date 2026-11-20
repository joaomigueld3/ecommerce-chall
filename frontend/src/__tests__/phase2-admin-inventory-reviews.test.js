import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryAdminPage from '@/app/admin/inventory/page';
import ReviewsAdminPage from '@/app/admin/reviews/page';
import Providers from '@/app/providers';
import {
  createStockMovement,
  getInventorySummary,
  getLowStockProducts,
  getStockMovements,
} from '@/features/inventory/api';
import { getProducts } from '@/features/products/api';
import {
  answerQuestion,
  getAllQuestions,
  getAllReviews,
  updateReviewStatus,
} from '@/features/reviews/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/features/inventory/api', () => ({
  getInventorySummary: jest.fn(),
  getLowStockProducts: jest.fn(),
  getStockMovements: jest.fn(),
  createStockMovement: jest.fn(),
}));

jest.mock('@/features/products/api', () => {
  const actual = jest.requireActual('@/features/products/api');
  return {
    ...actual,
    getProducts: jest.fn(),
  };
});

jest.mock('@/features/reviews/api', () => ({
  getAllReviews: jest.fn(),
  updateReviewStatus: jest.fn(),
  getAllQuestions: jest.fn(),
  answerQuestion: jest.fn(),
  updateQuestionStatus: jest.fn(),
}));

describe('Phase 2 Admin pages (Inventory Kardex & Reviews/Q&A Moderation)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('ecommerce.token', 'admin-jwt');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 1, email: 'admin@loomi.dev', type: 'Admin' }));

    getInventorySummary.mockResolvedValue({
      activeSkuCount: 50,
      totalUnits: 1200,
      lowStockCount: 3,
      outOfStockCount: 1,
      retailValue: '50000.00',
      costValue: '32000.00',
    });
    getLowStockProducts.mockResolvedValue({
      products: [
        { productId: 9, sku: 'OMN-0009', productName: 'Samsung Galaxy S8', category: 'Smartphones', quantityInStock: 0, minStockLevel: 10 },
      ],
    });
    getStockMovements.mockResolvedValue({
      movements: [
        {
          movementId: 1,
          productId: 9,
          type: 'INBOUND',
          quantity: 10,
          previousStock: 0,
          newStock: 10,
          reason: 'Initial opening stock',
          createdAt: '2026-11-20T10:00:00.000Z',
          Product: { productName: 'Samsung Galaxy S8' },
        },
      ],
    });
    getProducts.mockResolvedValue([
      { productId: 9, productName: 'Samsung Galaxy S8', quantityInStock: 0 },
    ]);
    createStockMovement.mockResolvedValue({
      message: 'Stock movement recorded successfully.',
      product: { productId: 9, quantityInStock: 10 },
    });

    getAllReviews.mockResolvedValue({
      reviews: [
        {
          reviewId: 5,
          productId: 1,
          authorName: 'DEMO CLIENT',
          rating: 5,
          title: 'Awesome laptop',
          comment: 'Runs great.',
          verifiedPurchase: true,
          status: 'Approved',
          createdAt: '2026-11-20T10:00:00.000Z',
          Product: { productName: 'Apple MacBook Pro 14' },
        },
      ],
    });
    updateReviewStatus.mockResolvedValue({ message: 'Review status updated.' });

    getAllQuestions.mockResolvedValue({
      questions: [
        {
          questionId: 3,
          productId: 1,
          authorName: 'DEMO CLIENT',
          question: 'Does it include charger?',
          answer: null,
          status: 'Published',
          createdAt: '2026-11-20T10:00:00.000Z',
          Product: { productName: 'Apple MacBook Pro 14' },
        },
      ],
    });
    answerQuestion.mockResolvedValue({ message: 'Question answered successfully.' });
  });

  it('renders inventory KPIs, low-stock alerts, Kardex history and supports quick restock', async () => {
    render(
      <Providers>
        <InventoryAdminPage />
      </Providers>,
    );

    expect(await screen.findByText('50')).toBeInTheDocument();
    expect(screen.getByText('Initial opening stock')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /restock \+10/i }));

    expect(createStockMovement).toHaveBeenCalledWith('admin-jwt', expect.objectContaining({
      productId: 9,
      type: 'INBOUND',
      quantity: 10,
    }));
  });

  it('moderates reviews and answers pending customer questions in /admin/reviews', async () => {
    render(
      <Providers>
        <ReviewsAdminPage />
      </Providers>,
    );

    expect(await screen.findByText('Awesome laptop')).toBeInTheDocument();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^hide$/i }));
    expect(updateReviewStatus).toHaveBeenCalledWith('admin-jwt', 5, 'Hidden');

    await user.click(screen.getByRole('button', { name: /q&a/i }));
    expect(await screen.findByText(/does it include charger/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/write official store answer/i), 'Yes, 67W USB-C charger included.');
    await user.click(screen.getByRole('button', { name: /publish answer/i }));
    expect(answerQuestion).toHaveBeenCalledWith('admin-jwt', 3, 'Yes, 67W USB-C charger included.');
  });
});
