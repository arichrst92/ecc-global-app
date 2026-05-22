/**
 * Local Market public browse API — /admin/me/local-market/* per BE handoff
 * doc 2026-05-22 (rev a).
 *
 * List endpoint paginated dengan `meta` di top-level — pakai raw fetch
 * supaya meta tidak ke-strip oleh api client (sama pattern dengan visit list).
 */

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError, type ApiErrorBody } from '@/types/api';
import { api } from './client';
import type {
  LocalBusiness,
  LocalMarketListResponse,
  LocalMarketQuery,
} from '@/types/localBusiness';

/**
 * GET /admin/me/local-market — public browse (isActive=true only).
 * Filter cabang/industri/tipe/online/search + paginated.
 */
export async function listLocalMarket(
  opts: LocalMarketQuery = {},
): Promise<LocalMarketListResponse> {
  const params = new URLSearchParams();
  if (opts.cabangId) params.set('cabangId', opts.cabangId);
  if (opts.industri) params.set('industri', opts.industri);
  if (opts.tipeBisnis) params.set('tipeBisnis', opts.tipeBisnis);
  if (typeof opts.isOnline === 'boolean') params.set('isOnline', String(opts.isOnline));
  if (opts.search) params.set('search', opts.search);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.sortBy) params.set('sortBy', opts.sortBy);
  if (opts.sortOrder) params.set('sortOrder', opts.sortOrder);
  const q = params.toString();
  const path = `/admin/me/local-market${q ? `?${q}` : ''}`;

  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${env.apiBaseUrl}${path}`, { method: 'GET', headers });
  const json = (await res.json().catch(() => null)) as
    | {
        success: true;
        data: LocalBusiness[];
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

/** GET /admin/me/local-market/:id — public detail (404 kalau isActive=false & bukan owner) */
export function getLocalMarketDetail(id: string) {
  return api.get<LocalBusiness>(`/admin/me/local-market/${id}`);
}
