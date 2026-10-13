/**
 * Homecell API — mobile-api-guide section 12.6 (incl. BE patch 21p).
 * Self-service endpoints untuk PIC homecell dan PIC area.
 */

import { api } from './client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import type {
  PicHomecell,
  PicArea,
  HomecellMember,
  HomecellDetail,
  AreaHomecellRow,
  HomecellOverview,
  HomecellListItem,
  HomecellNearestResponse,
  HomecellPublicDetail,
  HomecellJoinRequestRow,
} from '@/types/homecell';

/** GET /admin/me/homecell-managed — homecell yang user-nya PIC */
export function listManagedHomecells() {
  return api.get<PicHomecell[]>('/admin/me/homecell-managed');
}

/** GET /admin/me/homecell-area-managed — area yang user-nya PIC */
export function listManagedAreas() {
  return api.get<PicArea[]>('/admin/me/homecell-area-managed');
}

/**
 * POST /admin/homecell/:id/members/by-kode — tambah member via scan QR.
 * Errors:
 * - 404 kode tidak ditemukan
 * - 400 jemaat sudah jadi member
 */
export function addHomecellMemberByKode(homecellId: string, kode: string) {
  return api.post<HomecellMember>(
    `/admin/homecell/${homecellId}/members/by-kode`,
    { kode },
  );
}

/**
 * GET /admin/homecell/:id — detail + nested members.
 * Per BE patch 2026-05-21p (extended existing endpoint dengan field kode,
 * jenisKelamin di nested jemaat + area.picJemaatId).
 */
export function getHomecellDetail(homecellId: string) {
  return api.get<HomecellDetail>(`/admin/homecell/${homecellId}`);
}

/**
 * DELETE /admin/homecell/:id/members/by-jemaat/:jemaatId — soft delete member.
 * Per BE patch 2026-05-21p. Idempotent (return meta.alreadyRemoved=true kalau
 * sudah out). Path pakai /by-jemaat/ segment untuk hindari konflik dengan
 * existing /:memberId hard-delete admin.
 */
export async function removeHomecellMember(
  homecellId: string,
  jemaatId: string,
): Promise<{ member: HomecellMember; alreadyRemoved: boolean }> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${env.apiBaseUrl}/admin/homecell/${homecellId}/members/by-jemaat/${jemaatId}`,
    {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );
  const json = (await res.json()) as
    | {
        success: true;
        data: HomecellMember;
        meta?: { alreadyRemoved?: boolean };
      }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    member: json.data,
    alreadyRemoved: !!json.meta?.alreadyRemoved,
  };
}

/**
 * GET /admin/homecell-area/:id/homecells — list semua homecell di area
 * dengan picJemaat info (untuk PIC area yang bukan PIC homecell-nya).
 * Per BE patch 2026-05-21p (NEW endpoint). Filter isActive=true.
 */
export function listAreaHomecells(areaId: string) {
  return api.get<AreaHomecellRow[]>(`/admin/homecell-area/${areaId}/homecells`);
}

// ============================================================
//  Homecell untuk semua jemaat — /admin/me/homecell/*
// ============================================================

/** Ringkasan: homecell yang dipimpin, homecell saya, permintaan pending. */
export function getMyHomecellOverview() {
  return api.get<HomecellOverview>('/admin/me/homecell');
}

/** Daftar homecell di cabang saya (urut jarak kalau lat/lng dikirim). */
export function browseHomecells(
  params: { cabangId?: string | null; q?: string; lat?: number; lng?: number } = {},
) {
  const qs = new URLSearchParams();
  if (params.cabangId) qs.append('cabangId', params.cabangId);
  if (params.q) qs.append('q', params.q);
  if (params.lat != null && params.lng != null) {
    qs.append('lat', String(params.lat));
    qs.append('lng', String(params.lng));
  }
  const s = qs.toString();
  return api.get<HomecellListItem[]>(`/admin/me/homecell/browse${s ? `?${s}` : ''}`);
}

/** Rekomendasi homecell terdekat (hanya yang punya lokasi). */
export function nearestHomecells(lat: number, lng: number, cabangId?: string | null, limit = 3) {
  const c = cabangId ? `&cabangId=${encodeURIComponent(cabangId)}` : '';
  return api.get<HomecellNearestResponse>(
    `/admin/me/homecell/nearest?lat=${lat}&lng=${lng}&limit=${limit}${c}`,
  );
}

/** Detail read-only (anggota / calon anggota). */
export function getHomecellPublic(homecellId: string) {
  return api.get<HomecellPublicDetail>(`/admin/me/homecell/${homecellId}`);
}

export function requestJoinHomecell(homecellId: string, pesan?: string) {
  return api.post<{ requestId: string; status: 'PENDING' }>(
    `/admin/me/homecell/${homecellId}/join-request`,
    { pesan: pesan || undefined },
  );
}

export function cancelJoinHomecell(homecellId: string) {
  return api.delete<{ id: string; status: 'CANCELLED' }>(`/admin/me/homecell/${homecellId}/join-request`);
}

/** [Leader] permintaan bergabung PENDING di homecell yang dipimpin. */
export function listHomecellJoinRequests() {
  return api.get<HomecellJoinRequestRow[]>('/admin/me/homecell/join-requests');
}

export function approveHomecellJoin(requestId: string) {
  return api.post<{ requestId: string; status: 'APPROVED' }>(
    `/admin/me/homecell/join-requests/${requestId}/approve`,
  );
}

export function rejectHomecellJoin(requestId: string, reason?: string) {
  return api.post<{ requestId: string; status: 'REJECTED' }>(
    `/admin/me/homecell/join-requests/${requestId}/reject`,
    { reason: reason || undefined },
  );
}

/** [Leader] set lokasi dari link / koordinat Google Maps. null = hapus. */
export function setHomecellLokasi(homecellId: string, mapsUrl: string | null) {
  return api.patch<{ id: string; latitude: number | null; longitude: number | null; mapsUrl: string | null }>(
    `/admin/me/homecell/${homecellId}/lokasi`,
    { mapsUrl },
  );
}
