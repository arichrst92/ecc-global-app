import { create } from 'zustand';

import type { JenisJemaat } from '@/types/auth';

/**
 * Ephemeral state untuk sign-up wizard (3 step).
 * TIDAK persist (Zustand in-memory only) — reset saat user keluar atau selesai.
 *
 * Signup minimal — hanya 3 field user-facing: nama, gender, cabang.
 * - tanggalLahir & alamat dihapus (per user request 2026-05-21):
 *   data bisa dilengkapi nanti di Profile → Edit Profile.
 *   Mobile kirim placeholder values ke BE (pending request untuk make optional).
 * - homecell: admin assign manual atau via Settings setelah login.
 * - foto: upload di Settings → Edit Foto via POST /admin/me/foto multipart.
 *
 * Per request 2026-05-23 (M23): tambah role questions
 * - jenisJemaat (Jemaat Tetap vs New Comer)
 * - isFulltimer + fulltimerSubRoleId (opsional)
 */
type SignupState = {
  noHp: string;
  otpVerified: boolean;
  /** Unix ms timestamp kapan OTP verify expired (validForSeconds dari BE response) */
  otpVerifiedExpiresAt: number | null;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P' | '';
  cabangId: string;
  /** Pilih sub-role Jemaat. '' = belum dipilih (form validation will catch). */
  jenisJemaat: JenisJemaat | '';
  /** null = belum dijawab, true/false = sudah dijawab. */
  isFulltimer: boolean | null;
  /** ID sub-role dari /public/roles/fulltimer-sub-roles. Wajib kalau isFulltimer=true. */
  fulltimerSubRoleId: string;

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
  jenisKelamin: '',
  cabangId: '',
  jenisJemaat: '',
  isFulltimer: null,
  fulltimerSubRoleId: '',
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
