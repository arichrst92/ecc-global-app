import { create } from 'zustand';

/**
 * Ephemeral state untuk onboarding wizard (multi-step first-login untuk
 * legacy jemaat). NOT persisted — reset saat user selesai atau keluar app.
 *
 * Flow (per BE notice magic-link 2026-07-28):
 *   intro → add-phone-input → add-phone-otp (kalau missingNoHp)
 *         → profile → submitting → done
 *
 * Kalau `missingNoHp === false` dari onboardingReason, wizard skip 2 step
 * phone dan langsung ke profile.
 */

export type OnboardingStep =
  | 'intro'
  | 'add-phone-input' // Input nomor HP baru
  | 'add-phone-otp' // Input OTP untuk verify HP baru
  | 'profile' // Form profile fields
  | 'submitting'; // Lock UI while POST /auth/onboarding/complete in flight

type OnboardingState = {
  step: OnboardingStep;

  // ---- Add phone sub-state ----
  /** Nomor HP baru yang di-input user (E.164) — cache antara input step & OTP step. */
  pendingNoHp: string;
  /** True setelah OTP verify sukses — noHp sudah di-set di BE. */
  noHpVerified: boolean;

  // ---- Profile draft fields ----
  namaLengkap: string;
  jenisKelamin: 'L' | 'P' | '';
  tanggalLahir: string; // ISO date YYYY-MM-DD, '' = belum diisi
  alamat: string;
  cabangId: string;
  email: string;

  // ---- Actions ----
  setStep: (step: OnboardingStep) => void;
  setPendingNoHp: (v: string) => void;
  markNoHpVerified: () => void;
  setField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  /** Pre-fill dari user object saat wizard mount (namaLengkap, dll). */
  hydrateFromUser: (user: {
    namaLengkap?: string;
    email?: string | null;
    cabangId?: string;
  }) => void;
  reset: () => void;
};

const initial: Omit<
  OnboardingState,
  'setStep' | 'setPendingNoHp' | 'markNoHpVerified' | 'setField' | 'hydrateFromUser' | 'reset'
> = {
  step: 'intro',
  pendingNoHp: '',
  noHpVerified: false,
  namaLengkap: '',
  jenisKelamin: '',
  tanggalLahir: '',
  alamat: '',
  cabangId: '',
  email: '',
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setPendingNoHp: (pendingNoHp) => set({ pendingNoHp }),
  markNoHpVerified: () => set({ noHpVerified: true }),
  setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  hydrateFromUser: (user) =>
    set((state) => ({
      // Hanya pre-fill kalau state masih kosong — jangan overwrite kalau user
      // sudah mulai isi (mis. remount karena navigation).
      namaLengkap: state.namaLengkap || user.namaLengkap || '',
      email: state.email || user.email || '',
      cabangId: state.cabangId || user.cabangId || '',
    })),
  reset: () => set(initial),
}));
