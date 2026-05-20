/**
 * Family API — mobile-api-guide section 13.
 * Endpoint self-managed di /admin/me/family/*. Auto-verify (no 2-way confirm).
 */

import { api } from './client';
import type {
  FamilyRelation,
  LinkByKodePayload,
  LinkByPhonePayload,
  LinkFamilyResponse,
  RegisterNewFamilyPayload,
  RegisterNewFamilyResponse,
  FamilyRole,
} from '@/types/family';

/** GET /admin/me/family — list anggota keluarga current user */
export function listFamily() {
  return api.get<FamilyRelation[]>('/admin/me/family');
}

/** POST /admin/me/family/link-by-kode — link via QR scan (8 char kode).
 * Response shape berbeda dari list row — punya target field. */
export function linkByKode(payload: LinkByKodePayload) {
  return api.post<LinkFamilyResponse>('/admin/me/family/link-by-kode', payload);
}

/** POST /admin/me/family/link-by-phone — link via nomor HP */
export function linkByPhone(payload: LinkByPhonePayload) {
  return api.post<LinkFamilyResponse>('/admin/me/family/link-by-phone', payload);
}

/**
 * POST /admin/me/family/register-new — daftarkan jemaat baru + auto-link.
 * Untuk anak balita / lansia tanpa HP. Kalau noHp null → jemaat baru jadi
 * dependent (tidak bisa login mandiri). cabangId default = cabang current user.
 */
export function registerNewFamily(payload: RegisterNewFamilyPayload) {
  return api.post<RegisterNewFamilyResponse>('/admin/me/family/register-new', payload);
}

/**
 * PATCH /admin/me/family/:jemaatId — update role family member.
 * {jemaatId} = jemaat target (jemaatB di row family relation).
 */
export function updateFamilyRole(jemaatId: string, role: FamilyRole) {
  return api.patch<LinkFamilyResponse>(`/admin/me/family/${jemaatId}`, { role });
}

/**
 * DELETE /admin/me/family/:jemaatId — unlink family member.
 * Hapus kedua arah relasi (A→B + B→A). Tidak hapus akun jemaat target.
 */
export function unlinkFamily(jemaatId: string) {
  return api.delete<{ success: true }>(`/admin/me/family/${jemaatId}`);
}
