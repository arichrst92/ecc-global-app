/**
 * CKids API — Modul 28 point + hadiah untuk anak.
 * Per BE notice ckids-mobile-tab 2026-08-01.
 *
 * ⚠️ Endpoint status:
 * - `GET /admin/hadiah` — EXISTING, ready untuk consume katalog
 * - `GET /admin/gift-stall/lookup-jemaat` — EXISTING (Fulltimer-gated),
 *   dipakai sementara sebagai fallback untuk balance
 * - `GET /admin/me/children-points` — BELUM ADA, kirim
 *   `backend-request-ckids-me-endpoints.md`
 * - Filter jemaatId di `GET /admin/gift-stall/redeems` — BELUM ADA
 *
 * Mobile pakai fallback pattern sementara (multi-call per anak). Kalau BE
 * eventually ready, swap ke single-call endpoint.
 */

import { api } from './client';
import type {
  ChildPointBalance,
  HadiahKatalog,
  HadiahRedeem,
} from '@/types/ckids';

/**
 * GET /admin/me/children-points — BELUM ADA di BE (2026-08-02).
 *
 * Sementara throw ApiError yang gracefully di-handle di hook sebagai signal
 * untuk fallback ke pattern multi-call. Kalau BE deploy, remove throw +
 * uncomment real call.
 */
export function getMyChildrenPoints(): Promise<ChildPointBalance[]> {
  return api.get<ChildPointBalance[]>('/admin/me/children-points');
}

/**
 * GET /admin/gift-stall/lookup-jemaat?kode=X&cabangId=Y — EXISTING.
 * Fulltimer-gated di backend, tapi kadang jalan untuk PIC juga.
 * Dipakai sebagai fallback untuk single-anak balance lookup.
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
 * GET /admin/gift-stall/redeems?jemaatId=X — history redeem per anak.
 *
 * ⚠️ Filter `jemaatId` BELUM ADA di BE (2026-08-02) — kirim
 * `backend-request-ckids-me-endpoints.md`. Sementara call cuma tampil semua
 * redeem di cabang (kalau BE allow) — mobile client-side filter by jemaatId.
 */
export function getChildRedeemHistory(params: {
  jemaatId?: string;
  cabangId?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.jemaatId) search.set('jemaatId', params.jemaatId);
  if (params.cabangId) search.set('cabangId', params.cabangId);
  if (params.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  return api.get<HadiahRedeem[]>(
    qs ? `/admin/gift-stall/redeems?${qs}` : '/admin/gift-stall/redeems',
  );
}
