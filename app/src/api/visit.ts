/**
 * Visit (Movement) API — per BE handoff doc 2026-05-22.
 * Endpoint: /admin/me/visits/*
 *
 * Auth: JWT Bearer (sama dengan /admin/me/* lainnya).
 * BE wraps response in { success, data }; api client auto-unwraps.
 *
 * NOTE: List response punya struktur `{ data: [...], meta: {...} }` —
 * setelah api client unwrap outer, kita masih akses `.data` + `.meta`.
 */

import { api } from './client';
import type {
  CreateVisitPayload,
  UpdateVisitMetaPayload,
  UpdateVisitNotePayload,
  VisitDetail,
  VisitListItem,
  VisitListQuery,
  VisitListResponse,
} from '@/types/visit';

/** GET /admin/me/visits — paginated list dari perspektif caller */
export function listMyVisits(opts: VisitListQuery = {}) {
  const params = new URLSearchParams();
  if (opts.role) params.set('role', opts.role);
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.search) params.set('search', opts.search);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  return api.get<VisitListResponse>(
    `/admin/me/visits${q ? `?${q}` : ''}`,
  );
}

/** POST /admin/me/visits — create via QR scan */
export function createVisit(payload: CreateVisitPayload) {
  return api.post<VisitListItem>('/admin/me/visits', payload);
}

/** GET /admin/me/visits/:id */
export function getVisitDetail(id: string) {
  return api.get<VisitDetail>(`/admin/me/visits/${id}`);
}

/** PATCH /admin/me/visits/:id — update judul/lokasi (initiator-only) */
export function updateVisitMeta(id: string, payload: UpdateVisitMetaPayload) {
  return api.patch<VisitDetail>(`/admin/me/visits/${id}`, payload);
}

/** PATCH /admin/me/visits/:id/note — update own note (initiator OR target) */
export function updateVisitNote(id: string, payload: UpdateVisitNotePayload) {
  return api.patch<VisitDetail>(`/admin/me/visits/${id}/note`, payload);
}

/** DELETE /admin/me/visits/:id — cancel (initiator-only, < 1 jam) */
export function deleteVisit(id: string) {
  return api.delete<{ success: true }>(`/admin/me/visits/${id}`);
}
