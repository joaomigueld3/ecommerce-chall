'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

const CART_KEY = 'ecommerce.cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isReady, setIsReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
     one-time hydration from localStorage after mount; a lazy initializer would
     read localStorage during hydration and mismatch the prerendered HTML */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // corrupted storage: start with an empty cart
    }
    setIsReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, isReady]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.productId);
      if (existing) {
        return current.map((item) => (item.productId === product.productId
          ? { ...item, quantity: item.quantity + quantity }
          : item));
      }
      return [
        ...current,
        {
          productId: product.productId,
          productName: product.productName,
          price: Number(product.price),
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems((current) => current.map((item) => (item.productId === productId
      ? { ...item, quantity: safeQuantity }
      : item)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside a CartProvider');
  }
  return context;
}
