/**
 * Owner business API — /admin/me/businesses/* per BE handoff doc 2026-05-22 (rev a).
 * Auth: JWT Bearer; req.user.jemaatId = owner.
 */

import { api } from './client';
import type {
  CreateBusinessPayload,
  LocalBusiness,
  UpdateBusinessPayload,
} from '@/types/localBusiness';

/** GET /admin/me/businesses — list semua bisnis saya (incl nonaktif) */
export function listMyBusinesses() {
  return api.get<LocalBusiness[]>('/admin/me/businesses');
}

/** POST /admin/me/businesses */
export function createBusiness(payload: CreateBusinessPayload) {
  return api.post<LocalBusiness>('/admin/me/businesses', payload);
}

/** GET /admin/me/businesses/:id — owner-only */
export function getMyBusiness(id: string) {
  return api.get<LocalBusiness>(`/admin/me/businesses/${id}`);
}

/** PATCH /admin/me/businesses/:id — owner-only, partial update */
export function updateBusiness(id: string, payload: UpdateBusinessPayload) {
  return api.patch<LocalBusiness>(`/admin/me/businesses/${id}`, payload);
}

/** DELETE /admin/me/businesses/:id — hard delete + cleanup files */
export function deleteBusiness(id: string) {
  return api.delete<{ success: true }>(`/admin/me/businesses/${id}`);
}

type FileObj = { uri: string; name: string; type: string };

/** POST /admin/me/businesses/:id/hero — banner image (max 5 MB, auto-webp 1600px) */
export function uploadBusinessHero(id: string, file: FileObj) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('file', file);
  return api.upload<{ id: string; heroImageUrl: string }>(
    `/admin/me/businesses/${id}/hero`,
    formData,
  );
}

/** DELETE /admin/me/businesses/:id/hero */
export function deleteBusinessHero(id: string) {
  return api.delete<{ success: true }>(`/admin/me/businesses/${id}/hero`);
}

/** POST /admin/me/businesses/:id/logo — square 512x512 (server auto-crop center) */
export function uploadBusinessLogo(id: string, file: FileObj) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('file', file);
  return api.upload<{ id: string; logoUrl: string }>(
    `/admin/me/businesses/${id}/logo`,
    formData,
  );
}

/** DELETE /admin/me/businesses/:id/logo */
export function deleteBusinessLogo(id: string) {
  return api.delete<{ success: true }>(`/admin/me/businesses/${id}/logo`);
}

/** POST /admin/me/businesses/:id/profile-pdf — passthrough (max 5 MB) */
export function uploadBusinessProfilePdf(id: string, file: FileObj) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('file', file);
  return api.upload<{ id: string; companyProfileUrl: string }>(
    `/admin/me/businesses/${id}/profile-pdf`,
    formData,
  );
}

/** DELETE /admin/me/businesses/:id/profile-pdf */
export function deleteBusinessProfilePdf(id: string) {
  return api.delete<{ success: true }>(
    `/admin/me/businesses/${id}/profile-pdf`,
  );
}
