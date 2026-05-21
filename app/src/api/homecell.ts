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
