import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveJoinRequest,
  cancelMyJoinRequest,
  getMinistryDetail,
  getMinistrySchedule,
  getMyMinistrySchedule,
  joinMinistry,
  listJoinRequests,
  listMinistries,
  rejectJoinRequest,
  type JoinMinistryPayload,
} from '@/api/ministry';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { useAuthStore } from '@/stores/auth.store';
import { addDaysIso, todayIso } from '@/utils/date';

export const MINISTRY_KEYS = {
  all: ['ministry'] as const,
  list: (cabangId?: string | null) => [...MINISTRY_KEYS.all, 'list', cabangId ?? 'home'] as const,
  detail: (id: string | undefined) =>
    [...MINISTRY_KEYS.all, 'detail', id] as const,
};

/**
 * List ministry di cabang aktif (yang dipilih di app) — cache 5 menit.
 * Guest tidak punya akses (no token).
 */
export function useMinistryList() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const { viewingCabangId, isLoading } = useViewingBranch();
  return useQuery({
    queryKey: MINISTRY_KEYS.list(viewingCabangId),
    queryFn: () => listMinistries(viewingCabangId),
    staleTime: 5 * 60_000,
    enabled: !isGuest && !isLoading,
  });
}

/** Detail ministry + members. Guest tidak punya akses (no token). */
export function useMinistryDetail(id: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: MINISTRY_KEYS.detail(id),
    queryFn: () => getMinistryDetail(id!),
    enabled: !!id && !isGuest,
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
      qc.invalidateQueries({ queryKey: [...MINISTRY_KEYS.all, 'list'] });
      // Refresh /admin/me supaya profile "Pelayanan Saya" auto-populate
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/**
 * Join request PENDING — hanya di-fetch untuk leader (`enabled`).
 * Per docs/backend-request-ministry-join-approval.md.
 */
export function useMinistryJoinRequests(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...MINISTRY_KEYS.all, 'join-requests', id],
    queryFn: () => listJoinRequests(id!),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

function useInvalidateMinistry(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: MINISTRY_KEYS.detail(id) });
    qc.invalidateQueries({ queryKey: [...MINISTRY_KEYS.all, 'list'] });
    qc.invalidateQueries({ queryKey: [...MINISTRY_KEYS.all, 'join-requests', id] });
  };
}

export function useApproveJoinRequest(id: string) {
  const invalidate = useInvalidateMinistry(id);
  return useMutation({
    mutationFn: (v: { requestId: string; roleId: string }) =>
      approveJoinRequest(id, v.requestId, v.roleId),
    onSuccess: invalidate,
  });
}

export function useRejectJoinRequest(id: string) {
  const invalidate = useInvalidateMinistry(id);
  return useMutation({
    mutationFn: (v: { requestId: string; reason?: string }) =>
      rejectJoinRequest(id, v.requestId, v.reason),
    onSuccess: invalidate,
  });
}

export function useCancelMyJoinRequest(id: string) {
  const invalidate = useInvalidateMinistry(id);
  return useMutation({
    mutationFn: () => cancelMyJoinRequest(id),
    onSuccess: invalidate,
  });
}

/**
 * Jadwal pelayanan 4 minggu ke depan untuk satu ministry.
 * Per `docs/backend-request-ministry-schedule-roster.md` — BE endpoint
 * belum di-deploy; `getMinistrySchedule` sudah handle graceful 404
 * fallback (return `[]`), jadi hook ini aman dipanggil sebelum BE ready —
 * query akan resolve ke array kosong, bukan error state.
 */
export function useMinistrySchedule(id: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: [...MINISTRY_KEYS.all, 'schedule', id],
    queryFn: async () => {
      const from = todayIso();
      const to = addDaysIso(28); // 4 minggu
      return getMinistrySchedule(id!, from, to);
    },
    enabled: !!id && !isGuest,
    staleTime: 5 * 60_000,
  });
}

/**
 * Jadwal pelayanan cross-ministry untuk current user (4 minggu ke depan).
 * Untuk widget "Pelayanan Saya" di home tab. Sama seperti
 * `useMinistrySchedule`, graceful 404 fallback ke `[]` selama BE endpoint
 * belum live — widget consumer cukup hide diri kalau data kosong.
 */
export function useMyMinistrySchedule() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: [...MINISTRY_KEYS.all, 'my-schedule'],
    queryFn: async () => {
      const from = todayIso();
      const to = addDaysIso(28);
      return getMyMinistrySchedule(from, to);
    },
    enabled: !isGuest,
    staleTime: 5 * 60_000,
  });
}
