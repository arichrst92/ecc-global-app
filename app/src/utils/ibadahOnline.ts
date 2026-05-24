/**
 * Resolve URL akses online untuk ibadah — defensive multi-field fallback.
 *
 * Mobile expect field `linkOnline`. Tapi BE belum konfirmasi nama field
 * persis (lihat docs/backend-request-ibadah-online-link-and-image-urls.md).
 * Untuk robust handling sementara, accept beberapa kandidat nama field +
 * gunakan yang valid pertama.
 *
 * Setelah BE confirm field name, fallback list bisa dipersempit.
 */

const CANDIDATE_FIELDS = [
  'linkOnline',
  'urlOnline',
  'linkStream',
  'streamUrl',
  'linkYoutube',
  'urlYoutube',
  'linkZoom',
  'urlZoom',
  'linkMeet',
] as const;

/** Return first non-empty string URL from any of the candidate fields, else null. */
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

/** True kalau objek punya isOnline + salah satu link field terisi. */
export function hasOnlineAccess(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;
  if (!rec.isOnline) return false;
  return getOnlineLink(obj) !== null;
}
