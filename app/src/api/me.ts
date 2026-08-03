/**
 * Self-service API untuk current user — /admin/me/*.
 * Per mobile-api-guide section 12.2 + 12.3.
 */

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError, type ApiErrorBody } from '@/types/api';
import { api } from './client';
import type { MeStats, MeProfile } from '@/types/me';
import type { MyReservasi, ListMyReservasiParams } from '@/types/ibadah';

/** GET /admin/me — full profile (Jemaat + roles + homecells) */
export function getMyProfile() {
  return api.get<MeProfile>('/admin/me');
}

/** GET /admin/me/stats — streak, attended count, dll */
export function getMyStats() {
  return api.get<MeStats>('/admin/me/stats');
}

type UpdateProfilePayload = {
  namaLengkap?: string;
  email?: string;
  tanggalLahir?: string;
  jenisKelamin?: 'L' | 'P';
  alamat?: string;
  /** Direct branch change tanpa approval (per UX decision 2026-05-21).
   *  BE wajib accept ini di PATCH /admin/me — kalau belum, see
   *  docs/backend-request-direct-branch-change.md */
  cabangId?: string;
};

/** PATCH /admin/me — edit limited fields */
export function updateMyProfile(payload: UpdateProfilePayload) {
  return api.patch<MeProfile>('/admin/me', payload);
}

/**
 * GET /admin/me/reservasi — parent-scoped reservasi (self + anak).
 * Live 2026-08-03 (BE response `backend-request-me-reservasi-pickup-code.md`).
 *
 * Include reservasi jemaatId=self + reservasi anak yg di-checkin oleh user.
 * Filter defaults activeOnly=true (24 jam terakhir kalau tanggal kosong).
 */
export function listMyReservasi(params: ListMyReservasiParams = {}) {
  const search = new URLSearchParams();
  if (params.ibadahId) search.set('ibadahId', params.ibadahId);
  if (params.tanggal) search.set('tanggal', params.tanggal);
  if (params.status) search.set('status', params.status);
  if (params.activeOnly !== undefined)
    search.set('activeOnly', String(params.activeOnly));
  const qs = search.toString();
  return api.get<MyReservasi[]>(
    qs ? `/admin/me/reservasi?${qs}` : '/admin/me/reservasi',
  );
}

/** POST /admin/me/foto — upload foto profil (multipart) */
export function uploadMyFoto(file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('foto', file);
  return api.upload<{ id: string; fotoUrl: string }>('/admin/me/foto', formData);
}

/**
 * DELETE /admin/me — soft delete account (set isActive=false).
 * Per docs/backend-request-delete-account.md.
 *
 * BE verify confirmText match exact lalu revoke semua refresh tokens user.
 * Pakai raw fetch karena api.delete tidak support body argument (DELETE
 * with body is non-standard but BE accepts JSON body untuk validate
 * confirmText sebagai safety guard).
 */
export type DeleteAccountPayload = {
  /** Wajib match exact text (default "HAPUS AKUN SAYA") */
  confirmText: string;
  /** Optional reason untuk audit (max 500 chars) */
  reason?: string;
};

export type DeleteAccountResponse = {
  jemaatId: string;
  deactivatedAt: string;
  message: string;
  /** Jumlah session yang di-revoke (force-logout dari semua device). Per BE patch 22b. */
  revokedSessions: number;
};

export async function deleteMyAccount(payload: DeleteAccountPayload): Promise<DeleteAccountResponse> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${env.apiBaseUrl}/admin/me`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: DeleteAccountResponse }
    | ApiErrorBody
    | null;
  if (!json) {
    throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Invalid response' }, res.status);
  }
  if (!json.success) {
    throw new ApiError(json.error, res.status);
  }
  return json.data;
}
