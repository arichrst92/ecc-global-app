/**
 * Legal documents API — per BE patch 22b.
 * Public endpoint, accessible pre-login (skipAuth).
 *
 * BE auto-fallback ke `id` kalau lang yang diminta tidak ada.
 */

import { api } from './client';
import type { LegalDocument, LegalKey } from '@/types/legal';

/**
 * GET /public/legal/:key?lang=id|en
 *
 * Note: path `/public/legal/...` BUKAN `/admin/legal/...` (BE explicit
 * public namespace untuk pre-login access).
 */
export function getLegalDocument(key: LegalKey, lang: 'id' | 'en' = 'id') {
  return api.get<LegalDocument>(`/public/legal/${key}?lang=${lang}`, {
    skipAuth: true,
  });
}
