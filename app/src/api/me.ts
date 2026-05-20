/**
 * Self-service API untuk current user — /admin/me/*.
 * Per mobile-api-guide section 12.2 + 12.3.
 */

import { api } from './client';
import type { MeStats, MeProfile } from '@/types/me';

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
};

/** PATCH /admin/me — edit limited fields */
export function updateMyProfile(payload: UpdateProfilePayload) {
  return api.patch<MeProfile>('/admin/me', payload);
}

/** POST /admin/me/foto — upload foto profil (multipart) */
export function uploadMyFoto(file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('foto', file);
  return api.upload<{ id: string; fotoUrl: string }>('/admin/me/foto', formData);
}
