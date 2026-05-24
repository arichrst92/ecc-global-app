/**
 * Resolve URL akses online untuk ibadah — multi-field fallback.
 *
 * BE rename `linkStream` → `linkOnline` claim (2026-05-24) ternyata tidak
 * fully effective di production:
 * - `/admin/ibadah/:id` masih return `linkStream` (rename belum efektif untuk
 *   findUnique default spread)
 * - `/admin/ibadah/calendar` tidak return field sama sekali (select clause
 *   missing)
 * - `/admin/ibadah` (list) status unknown
 *
 * Workaround mobile: accept BOTH field names. Selama BE return salah satu,
 * mobile resolve. See docs/backend-followup-ibadah-linkonline-missing-in-response.md.
 *
 * Helper retained sebagai single source of truth — kalau BE eventually
 * standardize ke `linkOnline`, fallback array bisa di-trim.
 */

const CANDIDATE_FIELDS = ['linkOnline', 'linkStream'] as const;

/** Return first non-empty string URL from candidate fields, else null. */
export function getOnlineLink(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  for (const key of CANDIDATE_FIELDS) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** True kalau objek punya isOnline truthy + link terisi. */
export function hasOnlineAccess(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;
  if (!rec.isOnline) return false;
  return getOnlineLink(obj) !== null;
}

/**
 * Relaxed check: kalau link ada apapun status isOnline, return URL.
 * Reasoning: kalau admin set URL streaming, button stream harus visible
 * — `isOnline` flag jadi informational saja. Mencegah edge case dimana
 * admin lupa toggle `isOnline=true` tapi sudah masukkan link.
 */
export function getStreamLink(obj: unknown): string | null {
  return getOnlineLink(obj);
}
