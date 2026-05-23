/**
 * Ibadah API — calendar, list, detail, check-in.
 * Per mobile-api-guide section 4.
 */

import { api } from './client';
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
