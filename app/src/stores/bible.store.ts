import { create } from 'zustand';

import { storage } from '@/utils/storage';
import { useAuthStore } from '@/stores/auth.store';
import type { BibleBookmark, BibleFontSize } from '@/types/bible';

/**
 * Bible local store.
 *
 * - Bookmarks per-jemaatId supaya tidak cross-leak antar user di shared
 *   device. Format key: ecc.bible.v1
 * - Font size preference global (bukan per-user) — kayaknya overkill scope
 *   per-user untuk preference visual saja.
 * - Last-read ref per-jemaatId untuk "continue reading" di home.
 *
 * Saat BE punya /alkitab/bookmarks endpoint, store ini bisa di-sync
 * server-side dengan tetap pertahankan offline-first.
 */

const KEY = 'ecc.bible.v1';

type StoredShape = {
  bookmarksByJemaatId: Record<string, BibleBookmark[]>;
  lastReadByJemaatId: Record<string, { ref: string; bookId: number; bab: number } | null>;
  fontSize: BibleFontSize;
};

type State = {
  bookmarks: BibleBookmark[];
  lastRead: { ref: string; bookId: number; bab: number } | null;
  fontSize: BibleFontSize;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  addBookmark: (b: Omit<BibleBookmark, 'createdAt'>) => Promise<void>;
  removeBookmark: (ref: string, ayat: number | null) => Promise<void>;
  isBookmarked: (ref: string, ayat: number | null) => boolean;
  setLastRead: (ref: string, bookId: number, bab: number) => Promise<void>;
  setFontSize: (size: BibleFontSize) => Promise<void>;
};

async function readStore(): Promise<StoredShape> {
  try {
    const raw = await storage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StoredShape;
  } catch {
    // ignore
  }
  return {
    bookmarksByJemaatId: {},
    lastReadByJemaatId: {},
    fontSize: 'md',
  };
}

async function persistShape(shape: StoredShape) {
  try {
    await storage.setItem(KEY, JSON.stringify(shape));
  } catch {
    // ignore
  }
}

function currentJemaatId(): string | null {
  return useAuthStore.getState().user?.jemaatId ?? null;
}

export const useBibleStore = create<State>((set, get) => ({
  bookmarks: [],
  lastRead: null,
  fontSize: 'md',
  isHydrated: false,

  hydrate: async () => {
    const shape = await readStore();
    const jemaatId = currentJemaatId();
    const bookmarks = jemaatId ? (shape.bookmarksByJemaatId[jemaatId] ?? []) : [];
    const lastRead = jemaatId ? (shape.lastReadByJemaatId[jemaatId] ?? null) : null;
    set({
      bookmarks: [...bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      lastRead,
      fontSize: shape.fontSize ?? 'md',
      isHydrated: true,
    });
  },

  addBookmark: async (b) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const exist = get().bookmarks.find((x) => x.ref === b.ref && x.ayat === b.ayat);
    if (exist) return;
    const next: BibleBookmark = { ...b, createdAt: new Date().toISOString() };
    const list = [next, ...get().bookmarks];
    set({ bookmarks: list });
    const shape = await readStore();
    await persistShape({
      ...shape,
      bookmarksByJemaatId: { ...shape.bookmarksByJemaatId, [jemaatId]: list },
    });
  },

  removeBookmark: async (ref, ayat) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const list = get().bookmarks.filter((b) => !(b.ref === ref && b.ayat === ayat));
    set({ bookmarks: list });
    const shape = await readStore();
    await persistShape({
      ...shape,
      bookmarksByJemaatId: { ...shape.bookmarksByJemaatId, [jemaatId]: list },
    });
  },

  isBookmarked: (ref, ayat) => {
    return get().bookmarks.some((b) => b.ref === ref && b.ayat === ayat);
  },

  setLastRead: async (ref, bookId, bab) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const value = { ref, bookId, bab };
    set({ lastRead: value });
    const shape = await readStore();
    await persistShape({
      ...shape,
      lastReadByJemaatId: { ...shape.lastReadByJemaatId, [jemaatId]: value },
    });
  },

  setFontSize: async (size) => {
    set({ fontSize: size });
    const shape = await readStore();
    await persistShape({ ...shape, fontSize: size });
  },
}));
