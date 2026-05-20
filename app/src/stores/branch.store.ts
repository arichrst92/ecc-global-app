import { create } from 'zustand';
import { storage } from '@/utils/storage';

/**
 * Branch context (roaming) — TERPISAH dari home branch.
 *
 * Use case: jemaat Bandung sedang di Jakarta, ingin lihat ibadah/event Jakarta
 * tanpa kehilangan identitas Bandung.
 *
 * - Home branch = `User.cabang.id` (dari /admin/me) — permanent, ganti pakai
 *   Branch Change Request flow.
 * - Viewing branch = state lokal (di sini) — instant switch, no approval.
 *
 * Persist ke storage supaya user di Jakarta seminggu tidak perlu re-switch
 * tiap buka app.
 *
 * Lihat ADR-012 di docs/decisions.md.
 */

const KEY = 'ecc.viewingCabangId';

type BranchState = {
  /** ID cabang yang sedang di-view. null = pakai home branch (default). */
  viewingCabangId: string | null;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setViewingCabang: (cabangId: string | null) => Promise<void>;
  resetToHome: () => Promise<void>;
};

export const useBranchStore = create<BranchState>((set) => ({
  viewingCabangId: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const val = await storage.getItem(KEY);
      set({ viewingCabangId: val || null, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setViewingCabang: async (cabangId) => {
    if (cabangId) {
      await storage.setItem(KEY, cabangId);
    } else {
      await storage.deleteItem(KEY);
    }
    set({ viewingCabangId: cabangId });
  },

  resetToHome: async () => {
    await storage.deleteItem(KEY);
    set({ viewingCabangId: null });
  },
}));
