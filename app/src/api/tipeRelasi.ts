/**
 * Tipe relasi keluarga API — master data.
 * Per BE notice `backend-notice-family-refactor.md` 2026-08-02.
 *
 * Endpoint: GET /admin/keluarga/tipe
 * Response: TipeRelasi[] (11-12 tipe granular)
 */

import { api } from './client';
import type { TipeRelasi } from '@/types/tipeRelasi';

/** GET /admin/keluarga/tipe — semua tipe relasi granular (master data) */
export function listTipeRelasi() {
  return api.get<TipeRelasi[]>('/admin/keluarga/tipe');
}
