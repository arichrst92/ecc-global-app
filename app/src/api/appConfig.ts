/**
 * App config endpoint — public, no auth.
 * Per BE handoff 2026-05-23.
 */

import { api } from './client';
import type { AppConfig } from '@/types/appConfig';

export function getAppConfig() {
  return api.get<AppConfig>('/public/app-config', { skipAuth: true });
}
