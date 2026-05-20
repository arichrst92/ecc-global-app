// Auth-specific types untuk endpoints di section 1 + 12.1 mobile-api-guide

import type { User } from './api';

export type OtpPurpose = 'LOGIN' | 'ENROLLMENT' | 'RESET_FACE';

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
 * Payload untuk POST /auth/register.
 * Per BE patch 2026-05-21d: hanya 4 field WAJIB. Field lain optional —
 * user lengkapi nanti via Profile → Edit (PATCH /admin/me) atau upload foto
 * via POST /admin/me/foto.
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

export type FaceLoginPayload = {
  noHp: string;
  descriptor: number[]; // 128-dim Float32 array
};

export type LogoutPayload = {
  refreshToken: string;
};
