import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMinistryDetail,
  joinMinistry,
  listMinistries,
  type JoinMinistryPayload,
} from '@/api/ministry';

export const MINISTRY_KEYS = {
  all: ['ministry'] as const,
  list: () => [...MINISTRY_KEYS.all, 'list'] as const,
  detail: (id: string | undefined) =>
    [...MINISTRY_KEYS.all, 'detail', id] as const,
};

/** List semua ministry — cache 5 menit. */
export function useMinistryList() {
  return useQuery({
    queryKey: MINISTRY_KEYS.list(),
    queryFn: listMinistries,
    staleTime: 5 * 60_000,
  });
}

/** Detail ministry + members. */
export function useMinistryDetail(id: string | undefined) {
  return useQuery({
    queryKey: MINISTRY_KEYS.detail(id),
    queryFn: () => getMinistryDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Direct-join ministry (Phase 2 per BE response 2026-08-03).
 * Invalidate list + detail + `me` (untuk update me.ministries).
 */
export function useJoinMinistry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JoinMinistryPayload = {}) =>
      joinMinistry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINISTRY_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: MINISTRY_KEYS.list() });
      // Refresh /admin/me supaya profile "Pelayanan Saya" auto-populate
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
