import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  stock: number;
};

type WishState = {
  items: WishItem[];
  toggle: (item: WishItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((s) => {
          const exists = s.items.some((i) => i.id === item.id);
          return { items: exists ? s.items.filter((i) => i.id !== item.id) : [...s.items, item] };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      has: (id) => get().items.some((i) => i.id === id),
      clear: () => set({ items: [] }),
    }),
    { name: "greengrow-wishlist" }
  )
);
