/**
 * Auth API wrappers — endpoint untuk login, signup, refresh, logout.
 * Lihat reference/mobile-api-guide.md section 1 + 12.1.
 */

import { api } from './client';
import type {
  RequestOtpPayload,
  VerifyOtpPayload,
  RegisterPayload,
  AuthSuccessData,
  FaceLoginPayload,
  LogoutPayload,
} from '@/types/auth';

/**
 * POST /auth/otp/request
 * Kirim OTP ke WhatsApp user.
 * Errors yang mungkin:
 * - 404 NOT_FOUND: nomor belum terdaftar (untuk purpose=LOGIN)
 * - 409 CONFLICT: nomor sudah terdaftar (untuk purpose=ENROLLMENT)
 * - 429 TOO_MANY_REQUESTS: rate limit hit
 */
export function requestOtp(payload: RequestOtpPayload) {
  return api.post<{ message: string }>('/auth/otp/request', payload, { skipAuth: true });
}

/**
 * POST /auth/otp/verify
 * Verify OTP yang user input. Untuk LOGIN: return access + refresh token + user.
 * Untuk ENROLLMENT: mark OtpVerification.usedAt — flow lanjut ke /auth/register.
 *
 * Errors:
 * - 401 UNAUTHORIZED: OTP salah / kadaluarsa
 */
export function verifyOtp(payload: VerifyOtpPayload) {
  return api.post<AuthSuccessData>('/auth/otp/verify', payload, { skipAuth: true });
}

/**
 * POST /auth/register
 * Self-registration setelah OTP enrollment ter-verify.
 * BE check OtpVerification.usedAt + purpose=ENROLLMENT + ≤15min.
 *
 * Errors:
 * - 401 UNAUTHORIZED: OTP enrollment belum verify atau > 15 menit
 * - 409 CONFLICT: nomor sudah terdaftar
 * - 400 BAD_REQUEST: cabang tidak valid / nonaktif
 * - 429 TOO_MANY_REQUESTS: > 3 register/jam dari IP
 */
export function register(payload: RegisterPayload) {
  return api.post<AuthSuccessData>('/auth/register', payload, { skipAuth: true });
}

/**
 * POST /auth/face/login
 * Login dengan face recognition descriptor.
 * Descriptor 128-dim Float32 dari face-api / TensorFlow Lite di mobile.
 */
export function faceLogin(payload: FaceLoginPayload) {
  return api.post<AuthSuccessData>('/auth/face/login', payload, { skipAuth: true });
}

/**
 * POST /auth/logout
 * Invalidate refresh token di server.
 */
export function logout(payload: LogoutPayload) {
  return api.post<{ message: string }>('/auth/logout', payload, { skipAuth: true });
}

/**
 * GET /auth/me/access
 * Re-fetch resolved menuAccess (mis. admin baru update RBAC).
 */
export function getMeAccess() {
  return api.get<{
    canAccessPortal: boolean;
    menuAccess: Record<string, { canRead: boolean; canWrite?: boolean; canDelete?: boolean }>;
  }>('/auth/me/access');
}
