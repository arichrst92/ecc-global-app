/**
 * Jembatan Alkitab → editor catatan. Saat editor terbuka (mis. sedang mencatat
 * khotbah lalu membuka Alkitab), "Ke catatan" pada ayat menitipkan kutipan di
 * sini; editor menyisipkannya saat kembali fokus. Tidak dipersist.
 */
import { create } from 'zustand';

export type AyatInsert = { ref: string; quote: string };

type S = {
  editorsOpen: number;
  pending: AyatInsert[];
  open: () => void;
  close: () => void;
  push: (a: AyatInsert) => void;
  take: () => AyatInsert[];
};

export const useCatatanBridge = create<S>((set, get) => ({
  editorsOpen: 0,
  pending: [],
  open: () => set((s) => ({ editorsOpen: s.editorsOpen + 1 })),
  close: () => set((s) => ({ editorsOpen: Math.max(0, s.editorsOpen - 1) })),
  push: (a) => set((s) => ({ pending: [...s.pending, a] })),
  take: () => {
    const p = get().pending;
    if (p.length) set({ pending: [] });
    return p;
  },
}));
