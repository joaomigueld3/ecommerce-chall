import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreSettingsPage from '@/app/admin/settings/page';
import Client360Page from '@/app/admin/clients/[clientId]/page';
import WishlistPage from '@/app/wishlist/page';
import CartPage from '@/app/cart/page';
import Providers from '@/app/providers';
import { getStoreSettings, updateStoreSettings } from '@/features/store/api';
import { getClientOverview, updateClientCrm } from '@/features/clients/api';
import { getWishlist, removeWishlistItem } from '@/features/wishlist/api';

const mockRouter = { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() };
const mockParams = { clientId: '2' };
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams,
  usePathname: () => '/wishlist',
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/features/store/api', () => ({
  getStoreSettings: jest.fn(),
  updateStoreSettings: jest.fn(),
}));

jest.mock('@/features/clients/api', () => ({
  getClientOverview: jest.fn(),
  updateClientCrm: jest.fn(),
}));

jest.mock('@/features/wishlist/api', () => ({
  getWishlist: jest.fn(),
  removeWishlistItem: jest.fn(),
}));

describe('Phase 3 pages (White-Label Settings, Client 360 CRM, Wishlist & Save for Later)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();

    getStoreSettings.mockResolvedValue({
      settings: {
        storeName: 'omni.store',
        shortPrefix: 'omni',
        shortSuffix: '.store',
        tagline: 'Your everything store',
        logoUrl: '',
        primaryColor: '#0094b6',
        accentColor: '#00b4d8',
        defaultRegion: 'BR',
        freeShippingThresholdBr: 200,
        freeShippingThresholdUs: 50,
        freeShippingThresholdEu: 50,
        supportEmail: 'support@omni.store',
        supportPhone: '+55 11 99999-0000',
        legalEntityName: 'Omni Store LTDA',
        taxId: '11.222.333/0001-81',
      },
    });
    updateStoreSettings.mockResolvedValue({
      message: 'Store settings updated successfully.',
      settings: { storeName: 'aurora.shop' },
    });

    getClientOverview.mockResolvedValue({
      client: {
        clientId: 2,
        fullName: 'MARIA SILVA',
        documentType: 'CPF',
        documentNumber: '52998224725',
        email: 'maria@omni.store',
        phone: '+55 11 98888-1111',
        country: 'BR',
        tier: 'Prime',
        loyaltyPoints: 450,
        creditBalance: 75,
        status: true,
        blockedReason: null,
        internalNotes: 'VIP repeat buyer',
      },
      linkedUser: {
        id: 2,
        email: 'maria@omni.store',
        type: 'Client',
        confirmed: true,
      },
      crm: {
        ltv: 1250,
        averageOrderValue: 625,
        totalOrders: 2,
        paidOrdersCount: 2,
        cancellationRate: 0,
      },
      addresses: [
        {
          addressId: 10,
          label: 'Home',
          country: 'BR',
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Apt 42',
          city: 'Sao Paulo',
          state: 'SP',
          postalCode: '01310-100',
          isDefaultShipping: true,
        },
      ],
      paymentMethods: [
        {
          paymentMethodId: 20,
          brand: 'Visa',
          last4: '4242',
          holderName: 'MARIA SILVA',
          expMonth: 12,
          expYear: 2029,
          isDefault: true,
        },
      ],
      orders: [
        {
          orderId: 77,
          orderDate: '2026-11-20T12:00:00.000Z',
          status: 'Delivered',
          total: 625,
        },
      ],
    });
    updateClientCrm.mockResolvedValue({ message: 'Client CRM updated.' });

    getWishlist.mockResolvedValue({
      items: [
        {
          wishlistItemId: 1,
          productId: 5,
          product: {
            productId: 5,
            productName: 'Apple AirPods Max Silver',
            category: 'Mobile Accessories',
            price: 549.99,
            quantityInStock: 12,
            imageUrl: '/images/products/apple-airpods-max-silver.webp',
          },
        },
      ],
    });
    removeWishlistItem.mockResolvedValue({ message: 'Removed.' });
  });

  it('loads White-Label store settings, applies a color preset, and submits updates', async () => {
    window.localStorage.setItem('ecommerce.token', 'admin-jwt');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 1, email: 'admin@omni.store', type: 'Admin' }));

    render(
      <Providers>
        <StoreSettingsPage />
      </Providers>,
    );

    const nameInput = await screen.findByLabelText(/store name/i);
    expect(nameInput).toHaveValue('omni.store');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /emerald/i }));
    await user.clear(nameInput);
    await user.type(nameInput, 'aurora.shop');
    await user.click(screen.getByRole('button', { name: /save white-label settings/i }));

    expect(updateStoreSettings).toHaveBeenCalledWith(
      'admin-jwt',
      expect.objectContaining({
        storeName: 'aurora.shop',
        primaryColor: '#047857',
        accentColor: '#10b981',
      }),
    );
    expect(await screen.findByText(/saved and applied live/i)).toBeInTheDocument();
  });

  it('renders Client 360 CRM KPIs, addresses, wallet, orders and submits CRM updates', async () => {
    window.localStorage.setItem('ecommerce.token', 'admin-jwt');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 1, email: 'admin@omni.store', type: 'Admin' }));

    render(
      <Providers>
        <Client360Page />
      </Providers>,
    );

    expect(await screen.findByText('MARIA SILVA')).toBeInTheDocument();
    expect(screen.getByText(/Av\. Paulista, 1000/i)).toBeInTheDocument();
    expect(screen.getByText(/Visa •••• 4242/i)).toBeInTheDocument();
    expect(screen.getByText('#77')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/customer tier/i), 'VIP');
    await user.click(screen.getByRole('button', { name: /save crm updates/i }));

    expect(updateClientCrm).toHaveBeenCalledWith(
      'admin-jwt',
      '2',
      expect.objectContaining({
        tier: 'VIP',
        loyaltyPoints: 450,
        creditBalance: 75,
        status: true,
      }),
    );
  });

  it('renders Wishlist items and moves an item to the cart', async () => {
    window.localStorage.setItem('ecommerce.token', 'client-jwt');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 2, email: 'maria@omni.store', type: 'Client' }));

    render(
      <Providers>
        <WishlistPage />
      </Providers>,
    );

    expect(await screen.findByText('Apple AirPods Max Silver')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /move to cart/i }));

    expect(removeWishlistItem).toHaveBeenCalledWith('client-jwt', 5);
    expect(await screen.findByText(/moved "apple airpods max silver" to cart/i)).toBeInTheDocument();
  });

  it('supports Save for later and Move to cart in /cart', async () => {
    window.localStorage.setItem(
      'ecommerce.cart',
      JSON.stringify([
        { productId: 10, productName: 'Sony WH-1000XM5', price: 349.99, quantity: 1 },
      ]),
    );

    render(
      <Providers>
        <CartPage />
      </Providers>,
    );

    expect(await screen.findByText('Sony WH-1000XM5')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /save for later/i }));

    expect(await screen.findByText(/saved for later \(1\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /move to cart/i }));
    expect(screen.queryByText(/saved for later/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save for later/i })).toBeInTheDocument();
  });
});
