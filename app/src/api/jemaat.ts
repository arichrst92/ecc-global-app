/**
 * Jemaat API — per BE patch 2026-05-22a.
 *
 * Note: endpoint path = `/admin/jemaat-public/:id` (BUKAN `/admin/jemaat/:id`
 * yang merupakan admin CRUD existing). BE wrap response in `{ success, data }`,
 * jadi kita unwrap di sini.
 */

import { api } from './client';
import type { JemaatPublicProfile } from '@/types/jemaat';

/**
 * GET /admin/jemaat-public/:id — view-only profile dengan tiered visibility.
 * BE wraps response in `{ success, data }`; api client already unwraps,
 * sehingga return type langsung JemaatPublicProfile.
 */
export function getJemaatPublicProfile(id: string) {
  return api.get<JemaatPublicProfile>(`/admin/jemaat-public/${id}`);
}
