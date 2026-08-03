/**
 * CKids API — Modul 28 point + hadiah untuk anak.
 * Per BE notice ckids-mobile-tab 2026-08-01 + BE response 2026-08-03.
 *
 * Endpoint status:
 * - `GET /admin/hadiah` — EXISTING, katalog hadiah
 * - `GET /admin/me/children-points` — LIVE 2026-08-03 (BE response)
 * - `GET /admin/me/children-redeem-history` — LIVE 2026-08-03 (dedicated
 *   endpoint, bukan filter di /admin/gift-stall/redeems)
 * - `GET /admin/gift-stall/lookup-jemaat` — kept as fallback single-lookup
 *   (Fulltimer-gated, rarely used)
 */

import { api } from './client';
import type {
  ChildPointBalance,
  HadiahKatalog,
  HadiahRedeem,
} from '@/types/ckids';

/**
 * GET /admin/me/children-points — balance semua anak parent dalam 1 call.
 * BE response 2026-08-03: reliance pada JemaatRelasi (parent perlu setup
 * relasi anak dulu via /admin/me/family). Cache-Control: private, max-age=60.
 */
export function getMyChildrenPoints() {
  return api.get<ChildPointBalance[]>('/admin/me/children-points');
}

/**
 * GET /admin/gift-stall/lookup-jemaat?kode=X&cabangId=Y — EXISTING Fulltimer-gated.
 * Kept as legacy fallback — /admin/me/children-points sekarang preferred.
 */
export function lookupJemaatPoint(kode: string, cabangId: string) {
  const search = new URLSearchParams({ kode, cabangId }).toString();
  return api.get<{
    jemaat: { id: string; namaLengkap: string; fotoUrl?: string | null; kode: string; cabang: { id: string; nama: string } };
    cabangId: string;
    balance: number;
    lastUpdate: string;
  }>(`/admin/gift-stall/lookup-jemaat?${search}`);
}

/** GET /admin/hadiah?cabangId=X&isActive=true — katalog hadiah cabang. */
export function listHadiah(params: {
  cabangId?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.cabangId) search.set('cabangId', params.cabangId);
  if (params.isActive !== undefined) search.set('isActive', String(params.isActive));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.page != null) search.set('page', String(params.page));
  const qs = search.toString();
  return api.get<HadiahKatalog[]>(qs ? `/admin/hadiah?${qs}` : '/admin/hadiah');
}

/**
 * GET /admin/me/children-redeem-history?jemaatId=X&limit=20 — dedicated
 * parent-scoped history redeem per anak.
 *
 * Guard BE: `jemaatId` di query harus terverify sebagai anak requester (via
 * JemaatRelasi). Kalau bukan → 403 Forbidden.
 *
 * Per BE response 2026-08-03.
 */
export function getChildRedeemHistory(jemaatId: string, limit = 20) {
  const search = new URLSearchParams({
    jemaatId,
    limit: String(limit),
  }).toString();
  return api.get<HadiahRedeem[]>(`/admin/me/children-redeem-history?${search}`);
}
