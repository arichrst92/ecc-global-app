import { create } from 'zustand';
import { storage } from '@/utils/storage';

/**
 * Event flow state.
 *
 * Dua layer:
 * 1. **Ephemeral** (`catatan`) — in-memory only, reset saat keluar flow.
 *
 * 2. **Persistent participations** — Map<eventId, ParticipationInfo> di-store.
 *    Use case: user daftar event berbayar → belum upload bukti → keluar app
 *    → buka detail event lagi → harus tampil 'Lanjut Pembayaran', bukan
 *    'Daftar Sekarang' lagi. State direset hanya saat user batalkan,
 *    selesai bayar (HADIR), atau logout.
 */

const KEY = 'ecc.eventParticipations';

export type ParticipationInfo = {
  participationId: string;
  eventId: string;
  status: 'DAFTAR' | 'MENUNGGU_VERIFIKASI' | 'BAYAR' | 'HADIR' | 'BATAL';
  registeredAt: number; // unix ms
};

type State = {
  // Ephemeral
  catatan: string;
  // Persistent — keyed by eventId
  participations: Record<string, ParticipationInfo>;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setCatatan: (v: string) => void;
  addParticipation: (info: ParticipationInfo) => Promise<void>;
  updateParticipationStatus: (eventId: string, status: ParticipationInfo['status']) => Promise<void>;
  removeParticipation: (eventId: string) => Promise<void>;
  getParticipation: (eventId: string) => ParticipationInfo | null;
  clearAll: () => Promise<void>;
  resetFlow: () => void;
};

async function persist(participations: Record<string, ParticipationInfo>) {
  try {
    await storage.setItem(KEY, JSON.stringify(participations));
  } catch {
    // ignore
  }
}

export const useEventFlowStore = create<State>((set, get) => ({
  catatan: '',
  participations: {},
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await storage.getItem(KEY);
      const participations = raw ? (JSON.parse(raw) as Record<string, ParticipationInfo>) : {};
      set({ participations, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setCatatan: (v) => set({ catatan: v }),

  addParticipation: async (info) => {
    const next = { ...get().participations, [info.eventId]: info };
    set({ participations: next });
    await persist(next);
  },

  updateParticipationStatus: async (eventId, status) => {
    const current = get().participations[eventId];
    if (!current) return;
    const next = {
      ...get().participations,
      [eventId]: { ...current, status },
    };
    set({ participations: next });
    await persist(next);
  },

  removeParticipation: async (eventId) => {
    const next = { ...get().participations };
    delete next[eventId];
    set({ participations: next });
    await persist(next);
  },

  getParticipation: (eventId) => get().participations[eventId] ?? null,

  clearAll: async () => {
    set({ participations: {}, catatan: '' });
    await storage.deleteItem(KEY);
  },

  resetFlow: () => set({ catatan: '' }),
}));
