/**
 * Ministry API — per BE patch 2026-05-22a (list + detail) + Phase 2
 * `backend-request-ministry-endpoints.md` item 4 RESOLVED 2026-08-03
 * (POST /admin/ministry/:id/join simple direct-join, skip approval flow).
 *
 * Pelayanan di BE schema = "Ministry" di mobile naming.
 */

import { api } from './client';
import type {
  MinistryListItem,
  MinistryDetail,
} from '@/types/ministry';

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

/**
 * POST /admin/ministry/:id/join — direct join (status ACTIVE).
 * Per BE response 2026-08-03: skip approval flow, langsung ACTIVE.
 * - `roleId` optional — kalau kosong, BE pilih role level terendah (biasanya "Anggota")
 * - `motivasi` optional catatan untuk leader (in-app notif otomatis ke leader)
 *
 * Error responses:
 * - 400 kalau ministry.isActive=false ("Ministry ini tidak buka untuk join")
 * - 409 kalau user sudah member aktif (ALREADY_MEMBER)
 */
export type JoinMinistryPayload = {
  roleId?: string;
  motivasi?: string;
};

export type JoinMinistryResult = {
  membershipId: string;
  status: 'ACTIVE';
  ministry: { id: string; nama: string };
  posisi: string;
};

export function joinMinistry(id: string, payload: JoinMinistryPayload = {}) {
  return api.post<JoinMinistryResult>(
    `/admin/ministry/${id}/join`,
    payload,
  );
}
