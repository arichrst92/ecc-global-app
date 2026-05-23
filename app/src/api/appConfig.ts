/**
 * App config endpoint — public, no auth.
 * Per BE handoff 2026-05-23.
 *
 * suppressErrorReport: kita punya local fallback (APP_CONFIG_DEFAULTS) — kalau
 * endpoint 500/404, mobile gracefully degrade pakai default values. No need
 * spam error dashboard tiap refetch. Real outage akan ke-detect dari endpoint
 * lain yang critical.
 */

import { api } from './client';
import type { AppConfig } from '@/types/appConfig';

export function getAppConfig() {
  return api.get<AppConfig>('/public/app-config', {
    skipAuth: true,
    suppressErrorReport: true,
  });
}
