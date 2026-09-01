/**
 * Share utilities — build canonical Universal Link URLs untuk content types.
 *
 * Semua URL pakai `https://eccchurch.global/*` (bukan custom scheme `ecc://`)
 * supaya:
 * 1. Kalau recipient punya app installed → tap link buka app (via iOS AASA
 *    + Android App Links, deployed per BE update 2026-09-01)
 * 2. Kalau recipient tidak punya app → tap link buka website
 * 3. Link tampil professional (bukan `ecc://event/xxx` yang kelihatan aneh)
 *
 * Paths di sini harus match dengan AASA `paths` + Android intent filter
 * `pathPrefix` yang di-config di app.json v2.1.0.
 */

const BASE_URL = 'https://eccchurch.global';

/** Event detail — Universal Link buka event/[id].tsx di app. */
export function buildEventShareUrl(idOrSlug: string): string {
  return `${BASE_URL}/event/${encodeURIComponent(idOrSlug)}`;
}

/** News detail — Universal Link buka content/news/[id].tsx via redirect
 *  stub app/news/[id].tsx (short URL structure). */
export function buildNewsShareUrl(slug: string): string {
  return `${BASE_URL}/news/${encodeURIComponent(slug)}`;
}

/** Renungan detail — sama pattern dengan news. */
export function buildRenunganShareUrl(slug: string): string {
  return `${BASE_URL}/renungan/${encodeURIComponent(slug)}`;
}

/** Ibadah detail — Universal Link ke ibadah/[id].tsx. */
export function buildIbadahShareUrl(id: string): string {
  return `${BASE_URL}/ibadah/${encodeURIComponent(id)}`;
}
