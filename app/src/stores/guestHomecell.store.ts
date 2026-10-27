/**
 * Token permintaan bergabung homecell dari MODE TAMU — disimpan di perangkat.
 * Server hanya menyimpan hash token; status dibaca lewat
 * POST /public/homecell/guest-request/status.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type GuestHomecellToken = { token: string; homecellId: string; homecellNama: string; createdAt: number };

type Store = {
  items: GuestHomecellToken[];
  add: (x: GuestHomecellToken) => void;
  remove: (token: string) => void;
};

export const useGuestHomecellStore = create<Store>()(
  persist(
    (set) => ({
      items: [],
      // Satu permintaan per homecell; terbaru di depan; maksimal 10.
      add: (x) => set((s) => ({ items: [x, ...s.items.filter((i) => i.homecellId !== x.homecellId)].slice(0, 10) })),
      remove: (token) => set((s) => ({ items: s.items.filter((i) => i.token !== token) })),
    }),
    {
      name: 'ecc.guest-homecell.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
