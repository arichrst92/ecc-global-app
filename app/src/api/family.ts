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

/**
 * PATCH /admin/me/family/:jemaatId/profile — edit profile dependent member.
 * Per BE patch 2026-05-22a (initial) + 2026-05-22c (noHp + email extension).
 *
 * Auth: current user harus primaryGuardian dari jemaatId. Disallowed fields:
 * cabangId, kode, isActive.
 *
 * Field semantics:
 * - undefined → skip, tidak ubah
 * - null atau '' → clear field ke null
 * - string non-empty → update + uniqueness check (noHp, email)
 *
 * Saat noHp first-time di-set (dari null → value), BE auto-flip `isDependent`
 * flag (kalau noHp != null jemaat jadi full member). Audit log entry:
 * `dependent-promoted` (first noHp set) atau `dependent-edit-mobile` (regular).
 *
 * Errors:
 * - 400 validation (Zod regex noHp E.164, email format)
 * - 401 "Hanya primary guardian yang boleh edit profile dependent ini."
 * - 404 jemaat tidak ditemukan
 * - 409 "Nomor HP / email sudah terdaftar di akun jemaat lain"
 */
export type UpdateDependentProfilePayload = {
  namaLengkap?: string;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  alamat?: string | null;
  /** E.164 format '+62...'. Per BE patch 22c. */
  noHp?: string | null;
  email?: string | null;
};

export function updateDependentProfile(
  jemaatId: string,
  payload: UpdateDependentProfilePayload,
) {
  return api.patch<{
    id: string;
    namaLengkap: string;
    tanggalLahir: string | null;
    jenisKelamin: 'L' | 'P' | null;
    alamat: string | null;
    fotoUrl: string | null;
    noHp: string | null;
    email: string | null;
  }>(`/admin/me/family/${jemaatId}/profile`, payload);
}

/**
 * POST /admin/me/family/:jemaatId/foto — upload foto profile dependent member.
 * Per BE patch 2026-05-22a. Multipart form-data, field name `foto`.
 *
 * Auth: current user primaryGuardian + target is dependent.
 */
export function uploadDependentFoto(
  jemaatId: string,
  file: { uri: string; name: string; type: string },
) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('foto', file);
  return api.upload<{ id: string; fotoUrl: string }>(
    `/admin/me/family/${jemaatId}/foto`,
    formData,
  );
}
