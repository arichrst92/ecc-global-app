/**
 * Maintenance mode API — per BE handoff 2026-05-23.
 * Public endpoint (no auth) — accessible pre-login juga.
 *
 * BE auto-treat sebagai isEnabled=false kalau estimatedEndAt sudah lewat
 * tapi admin belum sempat off (graceful auto-disable).
 */

import { api } from './client';
import type { MaintenanceStatus } from '@/types/maintenance';

/** GET /public/maintenance */
export function getMaintenanceStatus() {
  return api.get<MaintenanceStatus>('/public/maintenance', { skipAuth: true });
}
