import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  image?: string;
  maxQuantity?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: string, variantId?: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item: CartItem) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );

        if (existingIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...items];
          const newQuantity = updatedItems[existingIndex].quantity + item.quantity;
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: item.maxQuantity
              ? Math.min(newQuantity, item.maxQuantity)
              : newQuantity,
          };
          set({ items: updatedItems });
        } else {
          // Add new item
          set({ items: [...items, item] });
        }
      },

      removeItem: (productId: string, variantId?: string) => {
        const { items } = get();
        set({
          items: items.filter(
            (item) =>
              !(item.productId === productId && item.variantId === variantId)
          ),
        });
      },

      updateQuantity: (productId: string, quantity: number, variantId?: string) => {
        const { items } = get();

        if (quantity <= 0) {
          set({
            items: items.filter(
              (item) =>
                !(item.productId === productId && item.variantId === variantId)
            ),
          });
          return;
        }

        set({
          items: items.map((item) => {
            if (item.productId === productId && item.variantId === variantId) {
              const maxQty = item.maxQuantity || Infinity;
              return { ...item, quantity: Math.min(quantity, maxQty) };
            }
            return item;
          }),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getItemQuantity: (productId: string, variantId?: string) => {
        const { items } = get();
        const item = items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        return item?.quantity || 0;
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
