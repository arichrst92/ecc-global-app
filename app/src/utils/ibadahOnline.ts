/**
 * Resolve URL akses online untuk ibadah.
 *
 * BE confirmed 2026-05-24: Prisma field renamed `linkStream` → `linkOnline`,
 * exposed di 4 endpoint (admin list, admin calendar, admin detail,
 * public calendar). Single source of truth = `linkOnline`.
 *
 * Helper retained sebagai type-safe accessor dengan null/empty-string
 * normalization (BE bisa return null atau string kosong; UI gate butuh
 * boolean truthy check yang konsisten).
 */

/** Return trimmed linkOnline string kalau non-empty, else null. */
export function getOnlineLink(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  const value = rec.linkOnline;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

/** True kalau objek punya isOnline truthy + linkOnline terisi. */
export function hasOnlineAccess(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;
  if (!rec.isOnline) return false;
  return getOnlineLink(obj) !== null;
}
