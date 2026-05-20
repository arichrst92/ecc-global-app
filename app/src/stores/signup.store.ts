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
  /** Unix ms timestamp kapan OTP verify expired (validForSeconds dari BE response) */
  otpVerifiedExpiresAt: number | null;
  namaLengkap: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: 'L' | 'P' | '';
  alamat: string;
  cabangId: string;

  setNoHp: (v: string) => void;
  setOtpVerified: (validForSeconds: number) => void;
  setField: <K extends keyof SignupState>(key: K, value: SignupState[K]) => void;
  reset: () => void;
};

const initial: Omit<SignupState, 'setNoHp' | 'setOtpVerified' | 'setField' | 'reset'> = {
  noHp: '',
  otpVerified: false,
  otpVerifiedExpiresAt: null,
  namaLengkap: '',
  tanggalLahir: '',
  jenisKelamin: '',
  alamat: '',
  cabangId: '',
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initial,
  setNoHp: (v) => set({ noHp: v }),
  setOtpVerified: (validForSeconds) =>
    set({
      otpVerified: true,
      otpVerifiedExpiresAt: Date.now() + validForSeconds * 1000,
    }),
  setField: (key, value) => set({ [key]: value } as Partial<SignupState>),
  reset: () => set(initial),
}));

/**
 * Helper: cek apakah window OTP enrollment masih valid.
 * Per BE: 15 menit dari verify success → harus lanjut /auth/register.
 */
export function isOtpEnrollmentValid(state: SignupState): boolean {
  return state.otpVerified && state.otpVerifiedExpiresAt !== null && Date.now() < state.otpVerifiedExpiresAt;
}
