import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/types/types";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => 
        set((state) => {
          // Check if the item already exists with the same properties
          const existingItemIndex = state.items.findIndex(
            (i) => 
              i.productId === item.productId && 
              i.size === item.size && 
              i.temperature === item.temperature &&
              // Compare addons
              JSON.stringify(i.addons.map(a => a.id).sort()) === 
              JSON.stringify(item.addons.map(a => a.id).sort())
          );

          if (existingItemIndex > -1) {
            // Update quantity of existing item
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += item.quantity;
            return { items: updatedItems };
          }

          // Add new item
          return { items: [...state.items, item] };
        }),
      
      removeItem: (id) => 
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      
      updateItemQuantity: (id, quantity) => 
        set((state) => ({
          items: state.items.map((item) => 
            item.id === id ? { ...item, quantity } : item
          ),
        })),
      
      clearCart: () => set({ items: [] }),
      
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      
      getTotalItems: () => {
        return get().items.reduce(
          (total, item) => total + item.quantity,
          0
        );
      },
    }),
    {
      name: "caferayah-cart",
    }
  )
); 