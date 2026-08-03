/**
 * CKids anak selection store — persist last-selected anak per user session.
 * Kalau parent multi-anak, user pilih 1 aktif untuk view balance + katalog.
 *
 * Persistence: AsyncStorage via storage util. Key namespaced supaya beda
 * user tidak share selection (mis. share device kasus).
 */

import { create } from 'zustand';
import { storage } from '@/utils/storage';

const KEY = 'ecc.ckids.selectedAnakId';

type CKidsSelectionState = {
  selectedAnakId: string | null;
  isHydrating: boolean;

  hydrate: () => Promise<void>;
  setSelectedAnakId: (id: string | null) => Promise<void>;
  /** Auto-pick default kalau belum ada selection + user punya minimal 1 anak. */
  ensureDefault: (defaultId: string) => Promise<void>;
};

export const useCKidsSelectionStore = create<CKidsSelectionState>((set, get) => ({
  selectedAnakId: null,
  isHydrating: true,

  hydrate: async () => {
    try {
      const saved = await storage.getItem(KEY);
      set({ selectedAnakId: saved, isHydrating: false });
    } catch {
      set({ isHydrating: false });
    }
  },

  setSelectedAnakId: async (id) => {
    if (id) {
      await storage.setItem(KEY, id);
    } else {
      await storage.deleteItem(KEY);
    }
    set({ selectedAnakId: id });
  },

  ensureDefault: async (defaultId) => {
    if (get().selectedAnakId) return;
    await storage.setItem(KEY, defaultId);
    set({ selectedAnakId: defaultId });
  },
}));
