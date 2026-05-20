import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { useAuthStore } from '@/stores/auth.store';

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
 *
 * **Scoping**: data di-tag dengan `jemaatId` supaya multi-user same-device
 * tidak cross-contaminate (mis. dev share device, atau jemaat ganti akun).
 * Saat hydrate, hanya participations milik current logged-in jemaat yang
 * dimuat ke memory.
 */

const KEY = 'ecc.eventParticipations.v2';
// Legacy key (pre-v2, no jemaatId scoping) — di-migrate saat hydrate
const LEGACY_KEY = 'ecc.eventParticipations';

export type ParticipationInfo = {
  participationId: string;
  eventId: string;
  status: 'DAFTAR' | 'MENUNGGU_VERIFIKASI' | 'BAYAR' | 'HADIR' | 'BATAL';
  registeredAt: number; // unix ms
  jemaatId: string; // owner — supaya tidak cross-leak antar user
};

type StoredShape = {
  // Map<jemaatId, Map<eventId, ParticipationInfo>>
  byJemaatId: Record<string, Record<string, ParticipationInfo>>;
};

type State = {
  // Ephemeral
  catatan: string;
  // In-memory view untuk current jemaat
  participations: Record<string, ParticipationInfo>;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setCatatan: (v: string) => void;
  addParticipation: (info: Omit<ParticipationInfo, 'jemaatId'>) => Promise<void>;
  updateParticipationStatus: (eventId: string, status: ParticipationInfo['status']) => Promise<void>;
  removeParticipation: (eventId: string) => Promise<void>;
  getParticipation: (eventId: string) => ParticipationInfo | null;
  clearAll: () => Promise<void>;
  resetFlow: () => void;
};

async function readStore(): Promise<StoredShape> {
  try {
    const raw = await storage.getItem(KEY);
    if (raw) {
      return JSON.parse(raw) as StoredShape;
    }
    // Try legacy migration
    const legacyRaw = await storage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      // Legacy data tidak punya jemaatId — best effort: tag dengan current user
      const currentJemaatId = useAuthStore.getState().user?.jemaatId;
      if (currentJemaatId) {
        const legacy = JSON.parse(legacyRaw) as Record<
          string,
          Omit<ParticipationInfo, 'jemaatId'>
        >;
        const migrated: Record<string, ParticipationInfo> = {};
        for (const [eventId, info] of Object.entries(legacy)) {
          migrated[eventId] = { ...info, jemaatId: currentJemaatId };
        }
        const shape: StoredShape = { byJemaatId: { [currentJemaatId]: migrated } };
        await storage.setItem(KEY, JSON.stringify(shape));
        await storage.deleteItem(LEGACY_KEY);
        return shape;
      }
    }
  } catch {
    // ignore — return empty
  }
  return { byJemaatId: {} };
}

async function persistShape(shape: StoredShape) {
  try {
    await storage.setItem(KEY, JSON.stringify(shape));
  } catch {
    // ignore
  }
}

function getCurrentJemaatId(): string | null {
  return useAuthStore.getState().user?.jemaatId ?? null;
}

export const useEventFlowStore = create<State>((set, get) => ({
  catatan: '',
  participations: {},
  isHydrated: false,

  hydrate: async () => {
    const shape = await readStore();
    const jemaatId = getCurrentJemaatId();
    const participations = jemaatId ? (shape.byJemaatId[jemaatId] ?? {}) : {};
    set({ participations, isHydrated: true });
  },

  setCatatan: (v) => set({ catatan: v }),

  addParticipation: async (info) => {
    const jemaatId = getCurrentJemaatId();
    if (!jemaatId) return; // tidak ada user — skip
    const full: ParticipationInfo = { ...info, jemaatId };
    const next = { ...get().participations, [info.eventId]: full };
    set({ participations: next });
    // Persist with scope
    const shape = await readStore();
    const userMap = { ...(shape.byJemaatId[jemaatId] ?? {}), [info.eventId]: full };
    await persistShape({ byJemaatId: { ...shape.byJemaatId, [jemaatId]: userMap } });
  },

  updateParticipationStatus: async (eventId, status) => {
    const current = get().participations[eventId];
    if (!current) return;
    const jemaatId = current.jemaatId;
    const updated: ParticipationInfo = { ...current, status };
    const next = { ...get().participations, [eventId]: updated };
    set({ participations: next });
    const shape = await readStore();
    const userMap = { ...(shape.byJemaatId[jemaatId] ?? {}), [eventId]: updated };
    await persistShape({ byJemaatId: { ...shape.byJemaatId, [jemaatId]: userMap } });
  },

  removeParticipation: async (eventId) => {
    const current = get().participations[eventId];
    if (!current) return;
    const jemaatId = current.jemaatId;
    const next = { ...get().participations };
    delete next[eventId];
    set({ participations: next });
    const shape = await readStore();
    const userMap = { ...(shape.byJemaatId[jemaatId] ?? {}) };
    delete userMap[eventId];
    await persistShape({ byJemaatId: { ...shape.byJemaatId, [jemaatId]: userMap } });
  },

  getParticipation: (eventId) => get().participations[eventId] ?? null,

  clearAll: async () => {
    // Logout flow: hanya clear in-memory view, JANGAN wipe storage.
    // Storage scoped by jemaatId, jadi re-login user yang sama akan
    // load ulang data mereka. User berbeda → load empty.
    // Untuk full wipe (mis. uninstall simulator), uninstall + reinstall.
    set({ participations: {}, catatan: '' });
  },

  resetFlow: () => set({ catatan: '' }),
}));
