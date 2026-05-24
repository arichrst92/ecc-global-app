/**
 * Role lookup API — public, no auth (untuk signup picker).
 * Per BE request docs/backend-request-signup-role-assignment.md.
 *
 * Sebelum BE rilis endpoint, mobile dapat 404 dan fall back ke disabled picker.
 */

import { api } from './client';
import type { FulltimerSubRole } from '@/types/role';

/** GET /public/roles/fulltimer-sub-roles — daftar pilihan sub-role yang
 *  user boleh pilih saat signup kalau mengaku fulltimer. */
export function listFulltimerSubRoles() {
  return api.get<FulltimerSubRole[]>('/public/roles/fulltimer-sub-roles', {
    skipAuth: true,
    suppressErrorReport: true, // graceful fallback di hook
  });
}
