/**
 * Owner business API — /admin/me/businesses/* per BE handoff doc 2026-05-22 (rev a).
 * Auth: JWT Bearer; req.user.jemaatId = owner.
 */

import { api } from './client';
import type {
  CreateBusinessPayload,
  LocalBusiness,
  LocalItem,
  LocalItemPayload,
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

// ===== 2.4.7 — Katalog item =====

/** GET /admin/me/businesses/:id/items — semua item (incl. nonaktif) + batas global */
export function listMyItems(bizId: string) {
  return api.get<{ items: LocalItem[]; max: number }>(`/admin/me/businesses/${bizId}/items`);
}
export function createItem(bizId: string, payload: LocalItemPayload) {
  return api.post<LocalItem>(`/admin/me/businesses/${bizId}/items`, payload);
}
export function updateItem(bizId: string, itemId: string, payload: Partial<LocalItemPayload>) {
  return api.patch<LocalItem>(`/admin/me/businesses/${bizId}/items/${itemId}`, payload);
}
export function deleteItem(bizId: string, itemId: string) {
  return api.delete<{ id: string }>(`/admin/me/businesses/${bizId}/items/${itemId}`);
}
export function reorderItems(bizId: string, ids: string[]) {
  return api.put<{ ok: true }>(`/admin/me/businesses/${bizId}/items-order`, { ids });
}
/** Foto item — server crop 3:2 (1200×800), maks. 4 */
export function uploadItemFoto(bizId: string, itemId: string, file: FileObj) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('file', file);
  return api.upload<LocalItem>(`/admin/me/businesses/${bizId}/items/${itemId}/foto`, formData);
}
export function deleteItemFoto(bizId: string, itemId: string, url: string) {
  return api.delete<LocalItem>(
    `/admin/me/businesses/${bizId}/items/${itemId}/foto?url=${encodeURIComponent(url)}`,
  );
}
