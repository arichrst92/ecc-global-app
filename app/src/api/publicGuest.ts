/**
 * Public guest-browse endpoints. No auth required.
 * Per BE handoff 2026-05-24 (docs/backend-request-public-endpoints-for-guest.md).
 *
 * Rate-limit 60/menit/IP via publicBrowseLimiter di BE.
 * Mobile cache 5-10 menit di React Query supaya tidak boros.
 */

import { env } from '@/config/env';
import { ApiError, type ApiErrorBody } from '@/types/api';
import { api } from './client';
import type {
  PublicEventResponse,
  PublicIbadahResponse,
  PublicLocalMarketResponse,
  PublicRekeningResponse,
} from '@/types/publicGuest';

type IbadahOpts = {
  cabangId?: string;
  from?: string; // YYYY-MM-DD, default today, max 90 hari
  to?: string;
};

/** Top-level fetch dengan meta — pakai raw fetch supaya meta tidak ke-strip. */
async function rawPublicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${env.apiBaseUrl}${path}`);
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: unknown; meta?: unknown }
    | ApiErrorBody
    | null;
  if (!json) {
    throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Invalid response' }, res.status);
  }
  if (!json.success) {
    throw new ApiError(json.error, res.status);
  }
  // Return { data, meta } shape — caller cast ke proper T
  return { data: json.data, meta: json.meta } as T;
}

export function publicIbadahCalendar(opts: IbadahOpts): Promise<PublicIbadahResponse> {
  const params = new URLSearchParams();
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  const q = params.toString();
  return rawPublicFetch<PublicIbadahResponse>(
    `/public/ibadah/calendar${q ? `?${q}` : ''}`,
  );
}

type EventOpts = {
  cabangId?: string;
  limit?: number;
  page?: number;
};

export function publicEventList(opts: EventOpts = {}): Promise<PublicEventResponse> {
  const params = new URLSearchParams();
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.page) params.set('page', String(opts.page));
  const q = params.toString();
  return rawPublicFetch<PublicEventResponse>(`/public/event${q ? `?${q}` : ''}`);
}

type LocalMarketOpts = {
  cabangId?: string;
  industri?: string;
  tipeBisnis?: string;
  limit?: number;
  page?: number;
};

export function publicLocalMarketList(
  opts: LocalMarketOpts = {},
): Promise<PublicLocalMarketResponse> {
  const params = new URLSearchParams();
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.industri) params.set('industri', opts.industri);
  if (opts.tipeBisnis) params.set('tipeBisnis', opts.tipeBisnis);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.page) params.set('page', String(opts.page));
  const q = params.toString();
  return rawPublicFetch<PublicLocalMarketResponse>(`/public/local-market${q ? `?${q}` : ''}`);
}

/** Rekening per cabang — single object response (not wrapped in meta). */
export function publicCabangRekening(cabangId: string): Promise<PublicRekeningResponse> {
  return api.get<PublicRekeningResponse>(`/public/cabang/${cabangId}/rekening`, {
    skipAuth: true,
  });
}
