/**
 * Visit (Movement) API — per BE handoff doc 2026-05-22.
 * Endpoint: /admin/me/visits/*
 *
 * Auth: JWT Bearer (sama dengan /admin/me/* lainnya).
 * BE wraps response in { success, data, meta? }; api client auto-unwraps `data`
 * tapi DROP `meta`. Untuk list endpoint (paginated), kita perlu meta untuk
 * `getNextPageParam` infinite query — jadi pakai raw fetch di bawah.
 */

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError, type ApiErrorBody } from '@/types/api';
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

/**
 * GET /admin/me/visits — paginated list dari perspektif caller.
 *
 * BE response: `{ success, data: [...], meta: { page, limit, total, totalPages } }`.
 * Standard api.get<T> drop meta — di sini pakai raw fetch supaya meta tetap
 * accessible untuk infinite scroll pagination.
 */
export async function listMyVisits(opts: VisitListQuery = {}): Promise<VisitListResponse> {
  const params = new URLSearchParams();
  if (opts.role) params.set('role', opts.role);
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.search) params.set('search', opts.search);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const path = `/admin/me/visits${q ? `?${q}` : ''}`;

  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${env.apiBaseUrl}${path}`, { method: 'GET', headers });
  const json = (await res.json().catch(() => null)) as
    | {
        success: true;
        data: VisitListItem[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }
    | ApiErrorBody
    | null;
  if (!json) {
    throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Invalid response' }, res.status);
  }
  if (!json.success) {
    throw new ApiError(json.error, res.status);
  }
  return { data: json.data, meta: json.meta };
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
