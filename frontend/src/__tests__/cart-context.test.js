import { act, renderHook } from '@testing-library/react';
import { CartProvider, useCart } from '@/features/cart/CartContext';

function wrapper({ children }) {
  return <CartProvider>{children}</CartProvider>;
}

describe('CartContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds items, merges duplicates and computes totals', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ productId: 1, productName: 'Mouse', price: '10.50' });
    });
    act(() => {
      result.current.addItem({ productId: 1, productName: 'Mouse', price: '10.50' }, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBeCloseTo(31.5);
  });

  it('never lets quantity drop below 1 and removes items', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ productId: 7, productName: 'Keyboard', price: 19.99 });
    });

    act(() => {
      result.current.updateQuantity(7, 0);
    });
    expect(result.current.items[0].quantity).toBe(1);

    act(() => {
      result.current.updateQuantity(7, -5);
    });
    expect(result.current.items[0].quantity).toBe(1);

    act(() => {
      result.current.updateQuantity(7, 4);
    });
    expect(result.current.items[0].quantity).toBe(4);

    act(() => {
      result.current.removeItem(7);
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ productId: 1, productName: 'Mouse', price: 10 });
      result.current.addItem({ productId: 2, productName: 'Keyboard', price: 20 });
    });
    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });
    expect(result.current.items).toHaveLength(0);
  });
});
