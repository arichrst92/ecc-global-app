/**
 * Event API per mobile-api-guide section 5 + 15.
 */

import { api } from './client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import type {
  EventListItem,
  EventDetail,
  EventParticipation,
  BatchRegisterResponse,
} from '@/types/event';

type ListOptions = {
  cabangId?: string;
  page?: number;
  limit?: number;
};

/** GET /admin/event?isPublished=true */
export function listEvents(opts: ListOptions = {}) {
  const params = new URLSearchParams({ isPublished: 'true' });
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  return api.get<EventListItem[]>(`/admin/event?${params}`);
}

/** GET /admin/event/:idOrSlug — accepts UUID or slug */
export function getEventDetail(idOrSlug: string) {
  return api.get<EventDetail>(`/admin/event/${idOrSlug}`);
}

type RegisterPayload = {
  jemaatId: string;
  nominalBayar?: number;
  catatan?: string;
};

/** POST /admin/event/:eventId/peserta — single jemaat registration */
export function registerPeserta(eventId: string, payload: RegisterPayload) {
  return api.post<EventParticipation>(`/admin/event/${eventId}/peserta`, payload);
}

type BatchRegisterPayload = {
  jemaatIds: string[];
  nominalBayarPerOrang?: number;
  catatan?: string;
};

/** POST /admin/event/:eventId/peserta/batch — multi-family registration (Phase 1) */
export function registerPesertaBatch(eventId: string, payload: BatchRegisterPayload) {
  return api.post<BatchRegisterResponse>(`/admin/event/${eventId}/peserta/batch`, payload);
}

/**
 * DELETE /admin/event/:eventId/peserta/me — cancel registrasi sendiri.
 * Per BE patch 2026-05-21g. Resolve current user dari JWT, mobile tidak perlu
 * kirim participationId.
 *
 * Idempotent: kalau status sudah BATAL, return 200 + meta.alreadyCancelled.
 * Rejected dengan 400 kalau status = HADIR.
 * Rejected dengan 404 kalau user belum terdaftar di event ini.
 *
 * Returns custom shape karena perlu akses ke `meta.alreadyCancelled` —
 * api.delete wrapper strip meta.
 */
export async function cancelMyParticipation(eventId: string): Promise<{
  participation: EventParticipation;
  alreadyCancelled: boolean;
}> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${env.apiBaseUrl}/admin/event/${eventId}/peserta/me`, {
    method: 'DELETE',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const json = (await res.json()) as
    | { success: true; data: EventParticipation; meta?: { alreadyCancelled?: boolean } }
    | { success: false; error: { code: 'NOT_FOUND' | 'BAD_REQUEST' | 'UNAUTHORIZED'; message: string } };

  if (!json.success) {
    throw new ApiError(json.error, res.status);
  }
  return {
    participation: json.data,
    alreadyCancelled: !!json.meta?.alreadyCancelled,
  };
}

/**
 * POST /admin/event/:eventId/peserta/:participationId/bukti — multipart upload.
 * Per BE patch 2026-05-21f (flexImageUpload helper): field name 'bukti' lebih
 * semantic untuk endpoint ini. BE accept juga 'foto', 'file', 'image' — semua OK.
 * MIME yang accepted: jpeg/png/webp/heic/heif/gif + octet-stream.
 */
export function uploadBukti(
  eventId: string,
  participationId: string,
  file: { uri: string; name: string; type: string },
) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('bukti', file);
  return api.upload<EventParticipation>(
    `/admin/event/${eventId}/peserta/${participationId}/bukti`,
    formData,
  );
}
