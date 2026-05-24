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

/** Descriptor length yang BE expect.
 *  v2 patch 21r awal: 192-dim asumsi MobileFaceNet typical.
 *  Setelah convert sirius-ai/MobileFaceNet_TF .pb → .tflite ternyata
 *  output 128-dim (per arch.txt Logits:[None, 128]). BE perlu update
 *  schema validation length === 128 (was 192). */
export const FACE_DESCRIPTOR_DIM = 128;

/** Versi model ML yang dipakai. Sinkron dengan BE — kalau ganti library/weights, bump.
 *  v2 patch 21r: switch dari facenet-v1 ke mobilefacenet-v1 (native TFLite). */
export const FACE_MODEL_VERSION = 'mobilefacenet-v1';

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
  /** Per BE patch liveness-nonce V1 (soft): kalau ada → di-verify. Optional
   * sampai V2 cutover 2026-06-01 yang akan enforce required. */
  livenessNonce?: string;
};

export type FaceLoginPayload = {
  noHp: string;
  descriptor: number[]; // 128-dim Float32 array
  modelVersion?: string;
  /** Per BE patch liveness-nonce V1: kalau ada → di-verify. */
  livenessNonce?: string;
};

/**
 * Liveness nonce per BE handoff 2026-05-22 (V1 soft, V2 required 2026-06-01).
 * Issue nonce sebelum liveness UI, submit balik di /face/login atau /face/enroll
 * untuk anti-replay protection (descriptor stolen → tidak bisa pakai tanpa
 * fresh nonce).
 */
export type LivenessNoncePurpose = 'LOGIN' | 'ENROLL';

export type RequestLivenessNoncePayload = {
  noHp: string;
  purpose: LivenessNoncePurpose;
};

export type LivenessNonceResponse = {
  /** Opaque JWT-style HMAC token. Mobile tidak perlu parse — simpan dan kirim balik. */
  nonce: string;
  expiresAt: string; // ISO
  ttlSeconds: number; // default 180 (3 menit)
};

/**
 * Error codes spesifik nonce — BE return 401 dengan code ini di /face/* response
 * kalau nonce invalid (V1 grace: hanya kalau nonce di-submit; absent = warn log).
 */
export type LivenessNonceErrorCode =
  | 'LIVENESS_NONCE_INVALID'
  | 'LIVENESS_NONCE_EXPIRED'
  | 'LIVENESS_NONCE_PURPOSE_MISMATCH'
  | 'LIVENESS_NONCE_BIND_MISMATCH'
  | 'LIVENESS_NONCE_REUSED';

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
