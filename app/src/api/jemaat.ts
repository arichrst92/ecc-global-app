/**
 * Jemaat API — per BE patch 2026-05-22a.
 *
 * Note: endpoint path = `/admin/jemaat-public/:id` (BUKAN `/admin/jemaat/:id`
 * yang merupakan admin CRUD existing). BE wrap response in `{ success, data }`,
 * jadi kita unwrap di sini.
 */

import { api } from './client';
import type { JemaatPublicProfile } from '@/types/jemaat';

/**
 * GET /admin/jemaat-public/:id — view-only profile dengan tiered visibility.
 * BE wraps response in `{ success, data }`; api client already unwraps,
 * sehingga return type langsung JemaatPublicProfile.
 */
export function getJemaatPublicProfile(id: string) {
  return api.get<JemaatPublicProfile>(`/admin/jemaat-public/${id}`);
}

/** Hasil cari jemaat untuk input manual di layar scan (no HP disamarkan). */
export type JemaatSearchResult = {
  id: string;
  kode: string | null;
  namaLengkap: string;
  fotoUrl: string | null;
  jenisKelamin: 'L' | 'P' | null;
  cabang: { id: string; nama: string } | null;
  noHpMasked: string | null;
  /** Tamu (non-anggota tanpa akun). */
  isTamu?: boolean;
};

/**
 * GET /admin/jemaat-public/search?q= — cocok dengan kode jemaat, nama, atau
 * no HP. Hasil diurutkan: kode persis → cabang yang sama → nama.
 */
export function searchJemaat(q: string, cabangId?: string | null) {
  const qs = new URLSearchParams({ q, limit: '20' });
  if (cabangId) qs.append('cabangId', cabangId);
  return api.get<JemaatSearchResult[]>(`/admin/jemaat-public/search?${qs}`);
}
