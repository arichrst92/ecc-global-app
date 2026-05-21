/**
 * Homecell API — mobile-api-guide section 12.6.
 * Self-service endpoints untuk PIC homecell dan PIC area.
 */

import { api } from './client';
import type { PicHomecell, PicArea, HomecellMember } from '@/types/homecell';

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
