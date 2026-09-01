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
  MineAndFamilyParticipationsResponse,
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
 * GET /admin/event/:idOrSlug/peserta/mine-and-family — per BE update
 * 2026-08-31 family-multi.
 *
 * List semua participation di event ini yg jemaatId-nya ada di family set
 * requester (self + JemaatRelasi direct + spouse-transitive). Skip BATAL,
 * sorted registeredAt DESC. Setiap item punya field extra:
 * - `isSelf: boolean`
 * - `relationLabel: string` ("Diri sendiri", "Istri", "Anak Laki-Laki", dll)
 *
 * Response envelope BE `{success, data: {participations: [...]}}` — kita
 * unwrap ke array langsung untuk kemudahan konsumsi hooks.
 */
export async function listMineAndFamilyParticipations(
  idOrSlug: string,
): Promise<EventParticipation[]> {
  const res = await api.get<MineAndFamilyParticipationsResponse>(
    `/admin/event/${idOrSlug}/peserta/mine-and-family`,
  );
  return res.participations;
}

/**
 * POST /admin/event/:idOrSlug/peserta/:participationId/self-cancel — per BE
 * update 2026-08-31 family-multi.
 *
 * Cancel participation by ID. Auth guard: `participation.jemaatId` harus di
 * family set requester (self + JemaatRelasi direct + spouse-transitive) —
 * kalau bukan → 403. Idempotent (`meta.alreadyCancelled=true` kalau sudah
 * BATAL). Reject 400 kalau status HADIR.
 *
 * BE pakai POST bukan DELETE karena `DELETE /peserta/:pid` sudah dipakai admin
 * hard-delete di portal admin (backward compat).
 */
export async function selfCancelParticipation(
  idOrSlug: string,
  participationId: string,
): Promise<{ participation: EventParticipation; alreadyCancelled: boolean }> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(
    `${env.apiBaseUrl}/admin/event/${idOrSlug}/peserta/${participationId}/self-cancel`,
    {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );
  const json = (await res.json()) as
    | { success: true; data: EventParticipation; meta?: { alreadyCancelled?: boolean } }
    | { success: false; error: { code: string; message: string } };

  if (!json.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new ApiError({ code: json.error.code as any, message: json.error.message }, res.status);
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
// EventDonation API — REMOVED di v1.9.3.
//
// Semua NOMINAL_BEBAS donation flow routed ke web (Apple Guideline 3.2.2iv
// charitable donation must be external). Mobile tidak lagi call:
// - GET /donations/me (listMyDonations)
// - POST /donations (createDonation)
// - POST /donations/:id/bukti (uploadDonationBukti)
// - DELETE /donations/:id (cancelDonation)
//
// BE endpoints tetap available untuk web + portal admin consumer. Kalau
// mobile perlu reintroduce donation display (mis. read-only history),
// re-add functions dari git history commit sebelum v1.9.3.
// ============================================================================
