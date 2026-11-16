import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderDetailsPage from '@/app/orders/[orderId]/page';
import Providers from '@/app/providers';
import { cancelOrder, getOrderSummary, processOrderPayment } from '@/features/orders/api';

const mockRouter = { replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ orderId: '42' }),
}));

jest.mock('@/features/orders/api', () => ({
  getOrderSummary: jest.fn(),
  processOrderPayment: jest.fn(),
  cancelOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  deleteOrder: jest.fn(),
}));

describe('Order details actions (simulated payment + cancel)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('ecommerce.token', 'fake-token');
    window.localStorage.setItem(
      'ecommerce.user',
      JSON.stringify({ id: 2, email: 'client@test.local', type: 'Client' }),
    );
    getOrderSummary.mockReset();
    processOrderPayment.mockReset();
    cancelOrder.mockReset();
  });

  it('allows confirming payment for Pending Payment order and cancelling afterwards', async () => {
    getOrderSummary
      .mockResolvedValueOnce({
        order: { orderId: 42, clientId: 5, status: 'Pending Payment', orderDate: '2026-11-16', total: '99.90' },
        items: [{ itemId: 1, productId: 1, quantity: 1, pricePerUnit: '99.90', subtotal: '99.90' }],
        recomputedTotal: '99.90',
        persistedTotal: '99.90',
        consistent: true,
      })
      .mockResolvedValueOnce({
        order: { orderId: 42, clientId: 5, status: 'Received', orderDate: '2026-11-16', total: '99.90' },
        items: [{ itemId: 1, productId: 1, quantity: 1, pricePerUnit: '99.90', subtotal: '99.90' }],
        recomputedTotal: '99.90',
        persistedTotal: '99.90',
        consistent: true,
      })
      .mockResolvedValueOnce({
        order: { orderId: 42, clientId: 5, status: 'Cancelled', orderDate: '2026-11-16', total: '99.90' },
        items: [{ itemId: 1, productId: 1, quantity: 1, pricePerUnit: '99.90', subtotal: '99.90' }],
        recomputedTotal: '99.90',
        persistedTotal: '99.90',
        consistent: true,
      });

    processOrderPayment.mockResolvedValue({
      message: 'Payment confirmed and stock debited.',
      paymentStatus: 'confirmed',
    });
    cancelOrder.mockResolvedValue({
      message: 'Order cancelled successfully.',
    });

    render(
      <Providers>
        <OrderDetailsPage />
      </Providers>,
    );

    expect(await screen.findByText(/Order #42/i)).toBeInTheDocument();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /confirm payment/i }));
    expect(processOrderPayment).toHaveBeenCalledWith('fake-token', 42, 'confirm');
    expect(await screen.findByText(/Payment confirmed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel order/i }));
    expect(cancelOrder).toHaveBeenCalledWith('fake-token', 42);
    expect(await screen.findByText(/Order cancelled successfully/i)).toBeInTheDocument();
  });
});
