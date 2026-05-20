import { create } from 'zustand';

/**
 * Ephemeral state untuk sign-up wizard (3 step).
 * TIDAK persist (Zustand in-memory only) — reset saat user keluar atau selesai.
 */
type SignupState = {
  // Step 1
  noHp: string; // E.164 setelah normalize
  // Step 2 (just marker bahwa OTP sudah verified — actual auth via /auth/register)
  otpVerified: boolean;
  // Step 3
  namaLengkap: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: 'L' | 'P' | '';
  alamat: string;
  cabangId: string;
  homecellId: string | null;

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
  homecellId: null,
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initial,
  setNoHp: (v) => set({ noHp: v }),
  setOtpVerified: (v) => set({ otpVerified: v }),
  setField: (key, value) => set({ [key]: value } as Partial<SignupState>),
  reset: () => set(initial),
}));
