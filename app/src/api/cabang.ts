/**
 * Cabang API — public catalog endpoint.
 * Lihat docs/backend-request-cabang-list.md (BE response 2026-05-21).
 */

import { api } from './client';
import type { Cabang } from '@/types/cabang';
import type { Rekening } from '@/types/rekening';

type ListOptions = {
  /** Default 'true'. 'false' untuk yang nonaktif saja. 'all' untuk semua. */
  isActive?: 'true' | 'false' | 'all';
};

/**
 * GET /auth/cabang — public, rate limited 30/min/IP.
 * Sort order dari BE: isActive DESC, nama ASC.
 */
export function listCabang(opts: ListOptions = {}) {
  const { isActive = 'true' } = opts;
  const query = isActive === 'true' ? '' : `?isActive=${isActive}`;
  return api.get<Cabang[]>(`/auth/cabang${query}`, { skipAuth: true });
}

/**
 * GET /admin/cabang/:id/rekening — list rekening cabang untuk persembahan.
 * Per mobile-api-guide section 8.1. JWT required.
 */
export function listRekeningCabang(cabangId: string) {
  return api.get<Rekening[]>(`/admin/cabang/${cabangId}/rekening`);
}
