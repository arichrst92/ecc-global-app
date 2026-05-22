/**
 * Ministry API — per BE patch 2026-05-22a (mobile-api-guide section 16).
 * Pelayanan di BE schema = "Ministry" di mobile naming.
 *
 * Read-only endpoints untuk Phase 1. Join flow (POST /admin/ministry/:id/join)
 * di-defer ke Phase 2 — sementara user hubungi leader via WA.
 */

import { api } from './client';
import type { MinistryListItem, MinistryDetail } from '@/types/ministry';

/**
 * GET /admin/ministry — list semua ministry (pelayanan) yang aktif.
 * BE wraps response in `{ success, data }`; api client already unwraps,
 * sehingga return type langsung array.
 */
export function listMinistries() {
  return api.get<MinistryListItem[]>('/admin/ministry');
}

/**
 * GET /admin/ministry/:id — detail ministry + member list.
 * `myMembership` populated kalau current user adalah member.
 */
export function getMinistryDetail(id: string) {
  return api.get<MinistryDetail>(`/admin/ministry/${id}`);
}
