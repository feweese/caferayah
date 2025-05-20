"use client";

import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart-store';
import { CartItem } from '@/types/types';

// This hook ensures that cart state is only accessed on the client side to prevent hydration issues
export function useCart() {
  const cartStore = useCartStore();
  const [mounted, setMounted] = useState(false);
  
  // Empty cart items for server rendering (prevents hydration mismatch)
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Only access the store after component has mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setItems(cartStore.items);
  }, [cartStore.items]);
  
  return {
    items: mounted ? cartStore.items : [],
    addItem: cartStore.addItem,
    removeItem: cartStore.removeItem,
    updateItemQuantity: cartStore.updateItemQuantity,
    clearCart: cartStore.clearCart,
    getTotalPrice: cartStore.getTotalPrice,
    getTotalItems: cartStore.getTotalItems,
  };
} 