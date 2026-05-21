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

/**
 * Face recognition (M13) — BE patch 21q.
 * Endpoint spec: docs/backend-request-face-recognition.md section "Endpoint spec final".
 */

/** Descriptor length yang BE expect. Stick di 128. */
export const FACE_DESCRIPTOR_DIM = 128;

/** Versi model ML yang dipakai. Sinkron dengan BE — kalau ganti library/weights, bump. */
export const FACE_MODEL_VERSION = 'facenet-v1';

/** Versi consent text yang user setujui — disimpan BE di User.faceMetadata.consentVersion. */
export const FACE_CONSENT_VERSION = 'v1-2026-05-21';

export type FaceEnrollMetadata = {
  consentVersion: string;
  platform: 'ios' | 'android' | 'web';
  deviceModel?: string;
  appVersion?: string;
};

export type FaceEnrollPayload = {
  descriptor: number[]; // 128 float, on-device computed
  modelVersion?: string; // default FACE_MODEL_VERSION
  metadata: FaceEnrollMetadata;
};

export type FaceLoginPayload = {
  noHp: string;
  descriptor: number[]; // 128-dim Float32 array
  modelVersion?: string;
};

/** Response GET /auth/me/face-profile */
export type FaceProfileStatus = {
  enrolled: boolean;
  enrolledAt: string | null;
  modelVersion: string | null;
};

/** Response POST/PUT /auth/face/enroll[me/face-profile] */
export type FaceEnrollResponse = {
  faceEnrolledAt: string;
  modelVersion: string;
  hasFaceEnrolled: true;
};

/** Response POST /auth/face/login. Sama dengan AuthSuccessData + confidence. */
export type FaceLoginResponse = AuthSuccessData & {
  confidence: number; // 0..1, higher = better match
};

export type LogoutPayload = {
  refreshToken: string;
};
