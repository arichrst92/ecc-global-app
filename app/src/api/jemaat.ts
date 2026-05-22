/**
 * Jemaat API — per BE patch 2026-05-22a.
 *
 * Note: endpoint path = `/admin/jemaat-public/:id` (BUKAN `/admin/jemaat/:id`
 * yang merupakan admin CRUD existing). BE wrap response in `{ success, data }`,
 * jadi kita unwrap di sini.
 */

import { api } from './client';
import type { JemaatPublicProfile } from '@/types/jemaat';

/** GET /admin/jemaat-public/:id — view-only profile dengan tiered visibility. */
export function getJemaatPublicProfile(id: string) {
  return api
    .get<{ success: boolean; data: JemaatPublicProfile }>(
      `/admin/jemaat-public/${id}`,
    )
    .then((r) => r.data);
}
