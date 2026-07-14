"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface CartContextType {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  itemCount: number;
  setItemCount: (n: number) => void;
}

const CartContext = createContext<CartContextType>({
  cartOpen: false,
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
  itemCount: 0,
  setItemCount: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const toggleCart = useCallback(() => setCartOpen((o) => !o), []);

  // Sync cart item count from cart data whenever cart query changes
  // This is set via useCart in cart-drawer
  return (
    <CartContext.Provider
      value={{ cartOpen, openCart, closeCart, toggleCart, itemCount, setItemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  return useContext(CartContext);
}
