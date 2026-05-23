/**
 * Telemetry service — fire-and-forget event push ke BE.
 *
 * Design principles:
 * - **Never throw**. Caller flow must continue regardless.
 * - **Never await**. Drop into background fetch, don't block UI.
 * - **Silent fallback**. 404 (BE belum implement endpoint), timeout, network
 *   error → drop, no console noise di production.
 * - **2s timeout**. Telemetry non-critical, jangan hold connection.
 *
 * Status integration:
 * - V1 (sekarang): mobile push events, BE belum implement endpoint → 404
 *   responses dropped silently. Code ini ready saat BE rilis tanpa app update.
 * - V2 (post BE response): BE konfirmasi endpoint → events ke-record di
 *   face_telemetry_event table, query dashboard pilot insight.
 *
 * Reference doc:
 * - docs/backend-request-face-confidence-threshold-and-telemetry.md
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { env } from '@/config/env';
import { FACE_MODEL_VERSION } from '@/types/auth';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/types/appConfig';
import type {
  FaceTelemetryDevice,
  FaceTelemetryPayload,
} from '@/types/telemetry';

const TELEMETRY_PATH = '/auth/face/telemetry';
const TELEMETRY_TIMEOUT_MS = 2000;

// Sampling rate cache — di-set oleh root layout dari useAppConfig data.
// Default = 1.0 (sample 100%) sampai app-config terload pertama kali.
// Service-layer code tidak hook-able, jadi pakai module-level mutable state
// disinkronisasi dari React layer.
let currentSamplingRate: number = APP_CONFIG_DEFAULTS.telemetrySamplingRate;

/** Di-call oleh root layout setiap appConfig refetch — update sampling rate
 *  yang dipakai trackFaceEvent. */
export function setTelemetrySamplingRate(rate: number): void {
  // Clamp 0..1 untuk safety
  currentSamplingRate = Math.max(0, Math.min(1, rate));
}

/** Apakah event harus di-sampled (kirim) — random decision per call. */
function shouldSample(): boolean {
  // Fast path: rate 1.0 (default) selalu sample, skip Math.random
  if (currentSamplingRate >= 1) return true;
  if (currentSamplingRate <= 0) return false;
  return Math.random() < currentSamplingRate;
}

/** Generate random session ID. Tidak perlu RFC4122 strict — cuma untuk
 *  correlate events dalam window pendek (one flow ~30s-2min). */
export function newTelemetrySessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDeviceMeta(): FaceTelemetryDevice {
  return {
    platform:
      Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    modelVersion: FACE_MODEL_VERSION,
    osVersion: typeof Platform.Version === 'string' || typeof Platform.Version === 'number'
      ? String(Platform.Version)
      : undefined,
  };
}

/**
 * Fire-and-forget event push. Returns immediately — fetch happens in
 * background, errors swallowed.
 *
 * Usage:
 *   trackFaceEvent({
 *     sessionId,
 *     event: 'face_login_attempt',
 *     outcome: 'success',
 *     flow: 'login',
 *   });
 */
export function trackFaceEvent(payload: FaceTelemetryPayload): void {
  // Client-side sampling per BE recommendation (rate dari /public/app-config).
  // Drop event sebelum network call kalau tidak ke-sampled.
  if (!shouldSample()) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[telemetry] sampled-out:', payload.event, currentSamplingRate);
    }
    return;
  }

  try {
    const body: FaceTelemetryPayload = {
      ...payload,
      device: payload.device ?? getDeviceMeta(),
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), TELEMETRY_TIMEOUT_MS);

    // Floating promise — intentionally not awaited.
    void fetch(`${env.apiBaseUrl}${TELEMETRY_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
      .then((res) => {
        // Silent on 404 (BE belum implement). Log lain di dev only.
        if (__DEV__ && res.status !== 200 && res.status !== 404) {
          // eslint-disable-next-line no-console
          console.warn('[telemetry] non-ok response:', res.status, body.event);
        }
      })
      .catch(() => {
        // Network error, timeout, abort — silent drop. Telemetry non-critical.
      })
      .finally(() => clearTimeout(timeoutId));

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[telemetry]', body.event, body.outcome, body.flow ?? '', body.failureReason ?? '');
    }
  } catch {
    // Defensive — never throw from telemetry.
  }
}
