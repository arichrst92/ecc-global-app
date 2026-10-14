/**
 * Ibadah API — calendar, list, detail, check-in.
 * Per mobile-api-guide section 4.
 */

import { api } from './client';
import { syncServerClock } from '@/utils/serverClock';
import type { IbadahListItem, IbadahOccurrence, IbadahDetail } from '@/types/ibadah';

type CalendarOptions = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  cabangId?: string;
};

/**
 * GET /admin/ibadah/calendar
 * Return semua occurrence ibadah dalam rentang tanggal.
 * Max range 366 hari.
 */
export function getIbadahCalendar(opts: CalendarOptions) {
  const params = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    ...(opts.cabangId ? { cabangId: opts.cabangId } : {}),
  });
  return api.get<IbadahOccurrence[]>(`/admin/ibadah/calendar?${params}`);
}

type ListOptions = {
  cabangId?: string;
  page?: number;
  limit?: number;
};

/** GET /admin/ibadah */
export function listIbadah(opts: ListOptions = {}) {
  const params = new URLSearchParams();
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const query = params.toString();
  return api.get<IbadahListItem[]>(`/admin/ibadah${query ? `?${query}` : ''}`);
}

/**
 * GET /admin/ibadah/:id
 * Per BE patch 2026-05-23a: optional `?tanggal=YYYY-MM-DD` untuk per-occurrence
 * petugas override. Tanpa tanggal → return petugas default master schedule.
 * Dengan tanggal → kalau ada override untuk tanggal itu, replace (bukan merge)
 * default; kalau tidak ada → fallback ke default.
 */
export function getIbadahDetail(id: string, tanggal?: string) {
  const query = tanggal ? `?tanggal=${tanggal}` : '';
  return api.get<IbadahDetail>(`/admin/ibadah/${id}${query}`);
}

// ============================================================
// Self check-in (saya + keluarga) — /admin/me/ibadah/:id/self-checkin
// ============================================================

export type SelfCheckinMember = {
  id: string;
  namaLengkap: string;
  fotoUrl: string | null;
  isSelf: boolean;
  relasi: string | null;
  status: 'NONE' | 'RESERVE' | 'JOIN' | 'CANCEL';
  checkedInAt: string | null;
  /** Tidak bisa self check-in (mis. event berbayar belum lunas). */
  disabledReason?: string | null;
};

export type SelfCheckinStatus = {
  available: boolean;
  reason: 'INACTIVE' | 'KIDS_IBADAH' | 'NOT_TODAY' | 'CANCELLED' | 'TOO_EARLY' | 'ENDED' | null;
  reasonText: string | null;
  tanggal: string;
  opensAt: string | null;
  closesAt: string | null;
  /** Jam server (ISO UTC) untuk sinkron jam HP. */
  serverNow?: string;
  ibadah: { id: string; nama: string; jamMulai: string; jamSelesai: string; lokasi: string | null };
  members: SelfCheckinMember[];
  /** requiresLocation=true → kirim lat/lng; server cek radius (meter). */
  venue?: { requiresLocation: boolean; radiusM: number | null };
};

export type SelfCheckinResult = {
  tanggal: string;
  results: { jemaatId: string; namaLengkap: string; result: 'CHECKED_IN' | 'ALREADY' | 'FAILED'; message?: string }[];
};

export async function getSelfCheckin(ibadahId: string) {
  const startedAt = Date.now();
  const data = await api.get<SelfCheckinStatus>(`/admin/me/ibadah/${ibadahId}/self-checkin`);
  syncServerClock(data.serverNow, startedAt);
  return data;
}

export const postSelfCheckin = (ibadahId: string, jemaatIds: string[], coords?: { lat: number; lng: number } | null) =>
  api.post<SelfCheckinResult>(`/admin/me/ibadah/${ibadahId}/self-checkin`, { jemaatIds, ...(coords ?? {}) });
