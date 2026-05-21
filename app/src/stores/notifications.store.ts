import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Notifications store — local-only untuk sekarang.
 *
 * BE push notification service belum tersedia (per backend-request-push-notification.md
 * pending). Untuk sekarang inbox menerima local notifications dari:
 * - Reminder ibadah Sabtu malam (scheduled local notif)
 * - Konfirmasi local setelah register/cancel event
 * - Status update setelah admin approve (kalau ada polling)
 *
 * Saat BE push service live, struktur ini tinggal di-extend dengan
 * server-fetched notifications.
 *
 * Scoping: per jemaatId supaya multi-user same-device tidak cross-leak.
 */

const KEY = 'ecc.notifications.v1';

export type NotificationCategory =
  | 'ibadah'
  | 'event'
  | 'renungan'
  | 'news'
  | 'payment'
  | 'family'
  | 'branch_change'
  | 'system';

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Deep link path (mis. '/event/abc' atau '/ibadah/xyz') */
  deepLink?: string | null;
  createdAt: number; // unix ms
  read: boolean;
  jemaatId: string;
};

type StoredShape = {
  byJemaatId: Record<string, NotificationItem[]>;
};

type State = {
  items: NotificationItem[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  add: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read' | 'jemaatId'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  unreadCount: () => number;
};

async function readStore(): Promise<StoredShape> {
  try {
    const raw = await storage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StoredShape;
  } catch {
    // ignore
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

function currentJemaatId(): string | null {
  return useAuthStore.getState().user?.jemaatId ?? null;
}

export const useNotificationsStore = create<State>((set, get) => ({
  items: [],
  isHydrated: false,

  hydrate: async () => {
    const shape = await readStore();
    const jemaatId = currentJemaatId();
    const items = jemaatId ? (shape.byJemaatId[jemaatId] ?? []) : [];
    // Sort newest first
    items.sort((a, b) => b.createdAt - a.createdAt);
    set({ items, isHydrated: true });
  },

  add: async (info) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...info,
      createdAt: Date.now(),
      read: false,
      jemaatId,
    };
    const next = [item, ...get().items];
    set({ items: next });
    const shape = await readStore();
    await persistShape({
      byJemaatId: { ...shape.byJemaatId, [jemaatId]: next },
    });
  },

  markRead: async (id) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const next = get().items.map((n) => (n.id === id ? { ...n, read: true } : n));
    set({ items: next });
    const shape = await readStore();
    await persistShape({
      byJemaatId: { ...shape.byJemaatId, [jemaatId]: next },
    });
  },

  markAllRead: async () => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const next = get().items.map((n) => ({ ...n, read: true }));
    set({ items: next });
    const shape = await readStore();
    await persistShape({
      byJemaatId: { ...shape.byJemaatId, [jemaatId]: next },
    });
  },

  remove: async (id) => {
    const jemaatId = currentJemaatId();
    if (!jemaatId) return;
    const next = get().items.filter((n) => n.id !== id);
    set({ items: next });
    const shape = await readStore();
    await persistShape({
      byJemaatId: { ...shape.byJemaatId, [jemaatId]: next },
    });
  },

  clearAll: async () => {
    // Hanya clear in-memory (consistent dengan event-flow store).
    // Storage tetap scoped per jemaatId, re-login load ulang.
    set({ items: [] });
  },

  unreadCount: () => get().items.filter((n) => !n.read).length,
}));
