import { create } from 'zustand';

/**
 * Ephemeral state untuk sign-up wizard (3 step).
 * TIDAK persist (Zustand in-memory only) — reset saat user keluar atau selesai.
 *
 * Note: homecell DIHAPUS — BE bisa di-set admin manual atau via Settings setelah login.
 *       Foto profil juga TIDAK di signup — user upload di Settings → Edit Foto.
 */
type SignupState = {
  noHp: string;
  otpVerified: boolean;
  namaLengkap: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: 'L' | 'P' | '';
  alamat: string;
  cabangId: string;

  setNoHp: (v: string) => void;
  setOtpVerified: (v: boolean) => void;
  setField: <K extends keyof SignupState>(key: K, value: SignupState[K]) => void;
  reset: () => void;
};

const initial: Omit<SignupState, 'setNoHp' | 'setOtpVerified' | 'setField' | 'reset'> = {
  noHp: '',
  otpVerified: false,
  namaLengkap: '',
  tanggalLahir: '',
  jenisKelamin: '',
  alamat: '',
  cabangId: '',
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initial,
  setNoHp: (v) => set({ noHp: v }),
  setOtpVerified: (v) => set({ otpVerified: v }),
  setField: (key, value) => set({ [key]: value } as Partial<SignupState>),
  reset: () => set(initial),
}));
