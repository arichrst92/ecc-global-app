/**
 * Post-login route resolution — decide apakah user langsung masuk main app
 * atau harus diarahkan ke onboarding wizard dulu.
 *
 * Konsumen: post-success handler di login screens (OTP verify, magic link verify).
 * Per BE notice magic-link 2026-07-28 (docs/backend-notice-magic-link-email-login.md).
 */

import type { User } from '@/types/api';

/**
 * Route absolute (untuk router.replace) berdasarkan user.needsOnboarding.
 *
 * - `true` → '/(auth)/onboarding' (wizard first-login untuk legacy jemaat)
 * - `false` / undefined → '/(tabs)' (main app)
 *
 * Backward compat: kalau BE lama tidak return field ini (undefined), fallback
 * ke main app supaya tidak block user existing.
 */
export function getPostLoginRoute(user: User): string {
  return user.needsOnboarding === true ? '/(auth)/onboarding' : '/(tabs)';
}

/**
 * Boolean guard — kadang caller butuh conditional check tanpa string.
 */
export function needsOnboarding(user: User): boolean {
  return user.needsOnboarding === true;
}
