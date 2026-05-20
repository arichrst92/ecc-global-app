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
  EventDonation,
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

/** GET /admin/event/:idOrSlug — accepts UUID or slug.
 * Per BE patch 2026-05-21i, response includes `myParticipation` field. */
export function getEventDetail(idOrSlug: string) {
  return api.get<EventDetail>(`/admin/event/${idOrSlug}`);
}

/** GET /admin/event/:idOrSlug/peserta/me — fetch user's participation.
 * Per BE patch 2026-05-21i. Returns participation row atau throws ApiError
 * dengan code 'NOT_FOUND' kalau user belum daftar.
 *
 * Pakai post-mutation (register/cancel/upload) supaya lebih ringan daripada
 * refetch detail penuh. Untuk initial load, prefer `myParticipation` di detail. */
export function getMyParticipation(idOrSlug: string) {
  return api.get<EventParticipation>(`/admin/event/${idOrSlug}/peserta/me`);
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
 * POST /admin/event/:eventId/peserta/:participationId/bukti — DEPRECATED.
 * Pakai uploadDonationBukti() di flow baru per BE patch 2026-05-21l.
 * Tetap available untuk backward-compat dengan kode lama.
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

// ============================================================================
// EventDonation API — BE patch 2026-05-21l (Opsi B sub-table)
// Setiap "pembayaran" event = 1 donation row. Untuk NOMINAL_BEBAS bisa multi.
// ============================================================================

type CreateDonationPayload = {
  /** Untuk NOMINAL_TETAP harus == event.nominal. Untuk NOMINAL_BEBAS bebas (>= min). */
  nominalBayar: number;
  catatan?: string;
};

/**
 * GET /admin/event/:idOrSlug/donations/me — list donations user di event ini.
 * Response berisi data array + meta.totalConfirmed (SUM nominal status=BAYAR).
 * Returns custom shape karena perlu akses meta.
 */
export async function listMyDonations(idOrSlug: string): Promise<{
  donations: EventDonation[];
  totalConfirmed: number;
}> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${env.apiBaseUrl}/admin/event/${idOrSlug}/donations/me`,
    {
      method: 'GET',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );
  const json = (await res.json()) as
    | {
        success: true;
        data: EventDonation[];
        meta?: { totalConfirmed?: number };
      }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    donations: json.data,
    totalConfirmed: json.meta?.totalConfirmed ?? 0,
  };
}

/**
 * POST /admin/event/:idOrSlug/donations — create donation baru.
 * BE auto-resolve atau create EventParticipation kalau user belum register.
 * Untuk NOMINAL_BEBAS bisa di-call berkali-kali.
 */
export function createDonation(idOrSlug: string, payload: CreateDonationPayload) {
  return api.post<EventDonation>(`/admin/event/${idOrSlug}/donations`, payload);
}

/**
 * POST /admin/event/:idOrSlug/donations/:donationId/bukti — upload bukti
 * transfer per donation. Per BE patch 2026-05-21l. Pakai field flexImageUpload
 * (jpeg/png/webp/heic/heif/gif accepted).
 */
export function uploadDonationBukti(
  idOrSlug: string,
  donationId: string,
  file: { uri: string; name: string; type: string },
) {
  const formData = new FormData();
  // @ts-expect-error RN FormData accepts file objects
  formData.append('bukti', file);
  return api.upload<EventDonation>(
    `/admin/event/${idOrSlug}/donations/${donationId}/bukti`,
    formData,
  );
}

/**
 * DELETE /admin/event/:idOrSlug/donations/:donationId — cancel donation.
 * Soft delete (status BATAL). Idempotent: kalau sudah BATAL, return
 * meta.alreadyCancelled=true.
 */
export async function cancelDonation(idOrSlug: string, donationId: string): Promise<{
  donation: EventDonation;
  alreadyCancelled: boolean;
}> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${env.apiBaseUrl}/admin/event/${idOrSlug}/donations/${donationId}`,
    {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );
  const json = (await res.json()) as
    | {
        success: true;
        data: EventDonation;
        meta?: { alreadyCancelled?: boolean };
      }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    donation: json.data,
    alreadyCancelled: !!json.meta?.alreadyCancelled,
  };
}
