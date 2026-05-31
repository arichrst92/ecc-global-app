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
  EnrollmentVerifyResponse,
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
 * POST /auth/otp/verify (purpose=LOGIN)
 * Verify OTP login → dapat access + refresh token + user (langsung auth).
 *
 * Errors:
 * - 401 UNAUTHORIZED: OTP salah / kadaluarsa
 */
export function verifyOtpLogin(payload: Omit<VerifyOtpPayload, 'purpose'>) {
  return api.post<AuthSuccessData>(
    '/auth/otp/verify',
    { ...payload, purpose: 'LOGIN' },
    { skipAuth: true },
  );
}

/**
 * POST /auth/otp/verify (purpose=ENROLLMENT)
 * Per BE patch 2026-05-21c: response BERBEDA dari LOGIN — tidak ada JWT.
 * Cuma marker bahwa OTP verified + window 15 menit untuk lanjut /auth/register.
 *
 * Errors:
 * - 401 UNAUTHORIZED: OTP salah / kadaluarsa
 */
export function verifyOtpEnrollment(payload: Omit<VerifyOtpPayload, 'purpose'>) {
  return api.post<EnrollmentVerifyResponse>(
    '/auth/otp/verify',
    { ...payload, purpose: 'ENROLLMENT' },
    { skipAuth: true },
  );
}

/**
 * @deprecated Pakai verifyOtpLogin atau verifyOtpEnrollment — response shape berbeda.
 * Tetap ada untuk backward compat selama refactor.
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
 * POST /auth/logout
 * Invalidate refresh token di server.
 */
export function logout(payload: LogoutPayload) {
  return api.post<{ message: string }>('/auth/logout', payload, { skipAuth: true });
}

/**
 * POST /auth/refresh
 * Tukar refreshToken jadi pair access+refresh baru. Dipakai oleh biometric
 * quick-login dari welcome screen untuk restore session tanpa OTP.
 */
export function refreshSession(refreshToken: string) {
  return api.post<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>('/auth/refresh', { refreshToken }, { skipAuth: true });
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
