/**
 * Tipe relasi keluarga (granular) — master data dari BE
 * per notice `backend-notice-family-refactor.md` 2026-08-02.
 *
 * Endpoint: GET /admin/keluarga/tipe → 11-12 tipe granular
 * (Suami, Istri, Ayah, Ibu, Anak Laki-Laki, Anak Perempuan,
 * Saudara Kandung, Kakek, Nenek, Cucu, Wali, Lainnya).
 */

import type { FamilyRole } from './family';

export type TipeRelasi = {
  id: string;
  nama: string;
  /** Optional deskripsi dari admin master data */
  deskripsi?: string | null;
  /** BE mungkin include kategori grouping — belum di-doc, defensive */
  kategori?: string | null;
};

/**
 * Mapping tipe granular → broad enum FamilyRole (untuk backward compat display).
 * Heuristik dari nama tipe — BE tidak expose mapping explicit.
 * Dipakai kalau row lama pakai `role` broad ATAU untuk category grouping picker.
 */
export function tipeToFamilyRole(nama: string): FamilyRole {
  const s = nama.toLowerCase();
  if (s.includes('suami') || s.includes('istri') || s.includes('pasangan'))
    return 'SPOUSE';
  if (s.includes('ayah') || s.includes('ibu') || s.includes('orang tua'))
    return 'PARENT';
  if (s.includes('anak')) return 'CHILD';
  if (s.includes('saudara') || s.includes('kakak') || s.includes('adik'))
    return 'SIBLING';
  if (s.includes('wali')) return 'GUARDIAN';
  return 'OTHER';
}

/**
 * Grouping semantic untuk section header di picker.
 */
export type TipeRelasiCategory =
  | 'pasangan'
  | 'orangtua'
  | 'anak'
  | 'saudara'
  | 'kakeknenek'
  | 'cucu'
  | 'walilain';

export function tipeCategoryKey(nama: string): TipeRelasiCategory {
  const s = nama.toLowerCase();
  if (s.includes('suami') || s.includes('istri')) return 'pasangan';
  if (s.includes('ayah') || s.includes('ibu')) return 'orangtua';
  if (s.includes('anak')) return 'anak';
  if (s.includes('saudara') || s.includes('kakak') || s.includes('adik'))
    return 'saudara';
  if (s.includes('kakek') || s.includes('nenek')) return 'kakeknenek';
  if (s.includes('cucu')) return 'cucu';
  return 'walilain';
}
