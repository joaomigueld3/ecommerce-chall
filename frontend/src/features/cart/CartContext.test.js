import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/features/cart/CartContext';

const PRODUCT_A = { productId: 1, productName: 'Keyboard', price: '100.00' };
const PRODUCT_B = { productId: 2, productName: 'Mouse', price: '50.00' };

function renderCart() {
  return renderHook(() => useCart(), {
    wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
  });
}

describe('CartContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds items and merges repeated additions of the same product', () => {
    const { result } = renderCart();

    act(() => result.current.addItem(PRODUCT_A));
    act(() => result.current.addItem(PRODUCT_A));
    act(() => result.current.addItem(PRODUCT_B));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]).toMatchObject({ productId: 1, quantity: 2, price: 100 });
    expect(result.current.totalQuantity).toBe(3);
    expect(result.current.totalPrice).toBe(250);
  });

  it('never lets the quantity drop below 1', () => {
    const { result } = renderCart();

    act(() => result.current.addItem(PRODUCT_A));
    act(() => result.current.setQuantity(1, 0));
    expect(result.current.items[0].quantity).toBe(1);

    act(() => result.current.setQuantity(1, -5));
    expect(result.current.items[0].quantity).toBe(1);

    act(() => result.current.setQuantity(1, 'garbage'));
    expect(result.current.items[0].quantity).toBe(1);

    act(() => result.current.setQuantity(1, '4'));
    expect(result.current.items[0].quantity).toBe(4);
  });

  it('removes items and clears the cart', () => {
    const { result } = renderCart();

    act(() => result.current.addItem(PRODUCT_A));
    act(() => result.current.addItem(PRODUCT_B));
    act(() => result.current.removeItem(1));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(2);

    act(() => result.current.clearCart());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('persists the cart to localStorage', () => {
    const { result } = renderCart();
    act(() => result.current.addItem(PRODUCT_A));

    const stored = JSON.parse(window.localStorage.getItem('cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ productId: 1, quantity: 1 });
  });
});
