import { create } from 'zustand';

/**
 * Ephemeral state untuk event registration flow (register → payment).
 * In-memory only — reset saat user keluar dari flow atau selesai.
 */

type State = {
  currentParticipationId: string | null;
  catatan: string;

  setParticipationId: (id: string | null) => void;
  setCatatan: (v: string) => void;
  reset: () => void;
};

export const useEventFlowStore = create<State>((set) => ({
  currentParticipationId: null,
  catatan: '',

  setParticipationId: (id) => set({ currentParticipationId: id }),
  setCatatan: (v) => set({ catatan: v }),
  reset: () => set({ currentParticipationId: null, catatan: '' }),
}));
