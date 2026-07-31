// Auth-specific types untuk endpoints di section 1 + 12.1 mobile-api-guide

import type { User } from './api';

export type OtpPurpose = 'LOGIN' | 'ENROLLMENT' | 'ONBOARDING_ADD_NOHP';

export type RequestOtpPayload = {
  noHp: string; // E.164 format
  purpose?: OtpPurpose; // default LOGIN
};

export type VerifyOtpPayload = {
  noHp: string;
  kode: string; // 6-digit
  purpose?: OtpPurpose;
};

/**
 * Tipe jemaat untuk auto-assignment subRole pada role "Jemaat":
 * - JEMAAT_TETAP: anggota resmi yang sudah commit di gereja ini
 * - NEW_COMER: jemaat baru yang sedang mencoba / belum commit
 *
 * Default fallback BE (kalau field tidak ada di payload): JEMAAT_TETAP
 * (mempertahankan behavior pra-2026-05-23). Per BE request doc
 * docs/backend-request-signup-role-assignment.md.
 */
export type JenisJemaat = 'JEMAAT_TETAP' | 'NEW_COMER';

/**
 * Payload untuk POST /auth/register.
 * Per BE patch 2026-05-21d: hanya 4 field WAJIB. Field lain optional —
 * user lengkapi nanti via Profile → Edit (PATCH /admin/me) atau upload foto
 * via POST /admin/me/foto.
 *
 * Per BE request 2026-05-23 (revised 2026-05-24): add jenisJemaat untuk
 * signup-time sub-role mapping. Fulltimer assignment di-handle admin manual
 * via portal (mobile tidak ask).
 */
export type RegisterPayload = {
  // Required
  noHp: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  cabangId: string;
  // Optional — kalau null/undefined, BE simpan NULL di DB
  tanggalLahir?: string; // ISO date "YYYY-MM-DD"
  alamat?: string;
  homecellId?: string | null;
  fotoBase64?: string;
  /** Pilih sub-role pada role Jemaat. Default JEMAAT_TETAP kalau tidak set.
   *  - JEMAAT_TETAP → role Jemaat + sub-role Tetap
   *  - NEW_COMER → role Jemaat + sub-role New Comer */
  jenisJemaat?: JenisJemaat;
  /** Email untuk backup login via magic link. Optional, tapi disarankan
   *  supaya kalau HP hilang / OTP WA gagal user bisa fallback ke email.
   *  Per BE notice magic-link 2026-07-28. */
  email?: string;
};

/**
 * Payload POST /auth/email/request-magic-link
 * Kirim magic link ke email jemaat. Response 200 selalu (anti-enumeration),
 * jadi mobile tidak bisa tau apakah email terdaftar dari response.
 * Rate limit: 5 request per 1 jam per IP.
 * Per BE notice magic-link 2026-07-28.
 */
export type RequestMagicLinkPayload = {
  email: string;
};

/**
 * Payload POST /auth/email/verify-magic-link
 * Consume token dari deeplink URL (ecc://auth/email/verify?token=xxx).
 * Rate limit: 10 request per 15 menit per IP.
 * Errors: 401 UNAUTHORIZED (token invalid / expired / already used).
 * Per BE notice magic-link 2026-07-28.
 */
export type VerifyMagicLinkPayload = {
  token: string;
};

/**
 * Payload POST /auth/onboarding/complete
 * Save profile fields + set onboardedAt=now(). Butuh Bearer JWT.
 * Semua field opsional — kalau undefined, BE skip. Idempotent.
 * Per BE notice magic-link 2026-07-28.
 */
export type CompleteOnboardingPayload = {
  namaLengkap?: string;
  jenisKelamin?: 'L' | 'P';
  tanggalLahir?: string; // ISO date "YYYY-MM-DD"
  alamat?: string;
  cabangId?: string;
  email?: string;
};

export type AuthSuccessData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

/**
 * Response shape khusus untuk verify OTP dengan purpose=ENROLLMENT.
 * BERBEDA dari LOGIN — tidak ada JWT karena jemaat belum ada di DB.
 * Cuma marker bahwa OTP sudah verified, mobile boleh lanjut /auth/register.
 *
 * Per BE patch 2026-05-21c.
 */
export type EnrollmentVerifyResponse = {
  otpVerified: true;
  purpose: 'ENROLLMENT';
  noHp: string;
  pendingRegistration: true;
  nextStep: 'POST /auth/register';
  validForSeconds: number; // default 900 (15 menit)
};

/**
 * Face recognition types — REMOVED 2026-05-26 (M33).
 * Feature de-scoped; BE endpoints retained 90 hari untuk APK lama
 * (lihat docs/backend-request-face-login-deprecation.md). Mobile baru
 * tidak punya consumer types ini — types dihapus untuk reduce noise.
 */

export type LogoutPayload = {
  refreshToken: string;
};
