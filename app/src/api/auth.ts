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
  RequestMagicLinkPayload,
  VerifyMagicLinkPayload,
  CompleteOnboardingPayload,
} from '@/types/auth';
import type { User } from '@/types/api';

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

// ============================================================
// Magic Link Email Login (BE notice magic-link 2026-07-28)
// ============================================================

/**
 * POST /auth/email/request-magic-link
 * Request magic link ke email jemaat. Response always 200 (anti-enumeration),
 * mobile tidak bisa tau apakah email exists di DB.
 *
 * Rate limit: 5 request per 1 jam per IP.
 *
 * Errors:
 * - 429 TOO_MANY_REQUESTS: rate limit hit — show friendly copy
 * - 400 BAD_REQUEST: format email invalid
 */
export function requestMagicLink(payload: RequestMagicLinkPayload) {
  return api.post<{ message: string }>('/auth/email/request-magic-link', payload, {
    skipAuth: true,
  });
}

/**
 * POST /auth/email/verify-magic-link
 * Consume token dari deeplink URL → issue JWT + user object.
 * One-time use: token yg sudah dipakai return 401 kalau di-retry.
 *
 * Rate limit: 10 request per 15 menit per IP.
 *
 * Errors:
 * - 401 UNAUTHORIZED: token invalid, expired (>15 menit), atau already used
 * - 429 TOO_MANY_REQUESTS: rate limit hit
 */
export function verifyMagicLink(payload: VerifyMagicLinkPayload) {
  return api.post<AuthSuccessData>('/auth/email/verify-magic-link', payload, {
    skipAuth: true,
  });
}

/**
 * POST /auth/email/resend-magic-link
 * Alias dari request-magic-link — untuk UX "Kirim Ulang" saat user gak dapat email.
 * Share rate limiter dengan request-magic-link (5 per 1 jam per IP).
 */
export function resendMagicLink(payload: RequestMagicLinkPayload) {
  return api.post<{ message: string }>('/auth/email/resend-magic-link', payload, {
    skipAuth: true,
  });
}

/**
 * POST /auth/otp/request — extended untuk purpose=ONBOARDING_ADD_NOHP
 * Kirim OTP ke nomor HP baru yang mau di-set untuk jemaat authenticated
 * (mis. legacy jemaat yang login via magic link, sekarang add noHp).
 *
 * BE cek: noHp belum dipakai jemaat lain (409 Conflict kalau ya).
 *
 * Errors:
 * - 409 CONFLICT: noHp sudah dipakai jemaat lain
 * - 429 TOO_MANY_REQUESTS: rate limit
 *
 * Per BE notice magic-link 2026-07-28 section 2.
 */
export function requestOtpAddNoHp(noHp: string) {
  return api.post<{ message: string }>('/auth/otp/request', {
    noHp,
    purpose: 'ONBOARDING_ADD_NOHP',
  });
}

/**
 * POST /auth/otp/verify — extended untuk purpose=ONBOARDING_ADD_NOHP
 * WAJIB kirim Authorization Bearer JWT — beda dari OTP verify normal.
 * BE extract jemaatId dari JWT (bukan lookup by noHp) → set Jemaat.noHp =
 * noHp untuk authenticated jemaat. TIDAK issue JWT baru.
 *
 * Errors:
 * - 401 UNAUTHORIZED: JWT invalid/missing atau OTP salah/expired
 * - 409 CONFLICT: noHp sudah dipakai jemaat lain (race condition)
 *
 * Per BE notice magic-link 2026-07-28 section 2.
 */
export function verifyOtpAddNoHp(payload: { noHp: string; kode: string }) {
  return api.post<{ noHp: string }>('/auth/otp/verify', {
    ...payload,
    purpose: 'ONBOARDING_ADD_NOHP',
  });
}

/**
 * POST /auth/onboarding/complete
 * Save profile fields + set onboardedAt=now(). Butuh Bearer JWT (JWT dari magic
 * link verify sebelumnya). Field yg undefined di-skip.
 *
 * Idempotent — kalau onboardedAt sudah NOT NULL, field lain tetap di-update
 * tapi onboardedAt gak berubah.
 *
 * Rate limit: 20 per 15 menit per user.
 *
 * Errors:
 * - 401 UNAUTHORIZED: JWT invalid / missing
 * - 400 BAD_REQUEST: cabang tidak valid, tanggal invalid, dll
 */
export function completeOnboarding(payload: CompleteOnboardingPayload) {
  return api.post<User>('/auth/onboarding/complete', payload);
}
