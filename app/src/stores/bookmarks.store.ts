import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bookmark store — News & Renungan article bookmarks.
 *
 * Cross-user (not namespaced per jemaatId) — simple "save for later" utility,
 * not sensitive data. Persist via zustand `persist` middleware + AsyncStorage
 * so it survives app restart. All actions are synchronous (optimistic) —
 * `persist` writes to AsyncStorage in the background without blocking state
 * updates, so toggling a bookmark reflects instantly in UI.
 */

export type BookmarkTipe = 'NEWS' | 'RENUNGAN';

export type BookmarkItem = {
  id: string; // article id
  tipe: BookmarkTipe;
  judul: string;
  slug: string;
  ringkasan: string;
  heroImageUrl?: string | null;
  publishedAt: string;
  savedAt: number; // Date.now() saat di-bookmark
};

type BookmarksStore = {
  items: Record<string, BookmarkItem>; // key by `${tipe}:${id}`
  add: (item: Omit<BookmarkItem, 'savedAt'>) => void;
  remove: (tipe: BookmarkTipe, id: string) => void;
  toggle: (item: Omit<BookmarkItem, 'savedAt'>) => void;
  isBookmarked: (tipe: BookmarkTipe, id: string) => boolean;
  clear: () => void;
};

function keyOf(tipe: BookmarkTipe, id: string): string {
  return `${tipe}:${id}`;
}

export const useBookmarksStore = create<BookmarksStore>()(
  persist(
    (set, get) => ({
      items: {},

      add: (item) => {
        const key = keyOf(item.tipe, item.id);
        set((state) => ({
          items: { ...state.items, [key]: { ...item, savedAt: Date.now() } },
        }));
      },

      remove: (tipe, id) => {
        const key = keyOf(tipe, id);
        set((state) => {
          if (!(key in state.items)) return state;
          const next = { ...state.items };
          delete next[key];
          return { items: next };
        });
      },

      toggle: (item) => {
        const key = keyOf(item.tipe, item.id);
        if (key in get().items) {
          get().remove(item.tipe, item.id);
        } else {
          get().add(item);
        }
      },

      isBookmarked: (tipe, id) => keyOf(tipe, id) in get().items,

      clear: () => set({ items: {} }),
    }),
    {
      name: 'ecc.bookmarks.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
