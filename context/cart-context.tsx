"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Product, getPriceNumber } from "@/content/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "chakung_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load cart from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [items, mounted]);

  const addItem = (product: Product, quantity = 1, openDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.slug === product.slug);
      if (existing) {
        return prev.map((item) =>
          item.product.slug === product.slug
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const removeItem = (slug: string) => {
    setItems((prev) => prev.filter((item) => item.product.slug !== slug));
  };

  const updateQuantity = (slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(slug);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.slug === slug ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = items.reduce((acc, item) => {
    const priceNum = getPriceNumber(item.product.price);
    return acc + priceNum * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
