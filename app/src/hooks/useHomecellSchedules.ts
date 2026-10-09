/**
 * Hooks untuk Homecell Schedule + Attendance feature.
 * Per docs/mobile-spec-homecell-schedule-attendance.md.
 *
 * Status pending BE deploy. Hooks tetap safe — error handling gracefully
 * di consumer (display empty state kalau 404).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listSchedules,
  getScheduleDetail,
  createSchedule,
  deleteSchedule,
  recordAttendance,
  deleteAttendance,
} from '@/api/homecellSchedule';
import type {
  CreateSchedulePayload,
} from '@/types/homecellSchedule';

export function useHomecellSchedules(homecellId: string | undefined) {
  return useQuery({
    queryKey: ['homecell', homecellId, 'schedules'],
    queryFn: () => listSchedules(homecellId!),
    enabled: !!homecellId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useHomecellSchedule(
  homecellId: string | undefined,
  scheduleId: string | undefined,
) {
  return useQuery({
    queryKey: ['homecell', homecellId, 'schedule', scheduleId],
    queryFn: () => getScheduleDetail(homecellId!, scheduleId!),
    enabled: !!homecellId && !!scheduleId,
    staleTime: 30_000,
    // Refetch tiap 15s saat screen active — supaya saat PIC scan banyak
    // member berturut, attendance list auto-update di background.
    refetchInterval: 15_000,
    retry: 1,
  });
}

export function useCreateSchedule(homecellId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) =>
      createSchedule(homecellId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
      qc.invalidateQueries({ queryKey: ['homecell', 'detail', homecellId] });
    },
  });
}

export function useDeleteSchedule(homecellId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(homecellId, scheduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
      qc.invalidateQueries({ queryKey: ['homecell', 'detail', homecellId] });
    },
  });
}

export function useRecordAttendance(homecellId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kode: string) => recordAttendance(homecellId, scheduleId, kode),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['homecell', homecellId, 'schedule', scheduleId],
      });
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
    },
  });
}

export function useDeleteAttendance(homecellId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attendanceId: string) =>
      deleteAttendance(homecellId, scheduleId, attendanceId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['homecell', homecellId, 'schedule', scheduleId],
      });
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
    },
  });
}

/**
 * Bulk record attendance via checklist UI.
 *
 * BE belum punya bulk endpoint — mobile workaround Promise.allSettled loop
 * ke single recordAttendance per kode. Return { success, failed, errors }
 * supaya UI bisa show partial result toast.
 *
 * Dedicated BE bulk endpoint di-request via backend-request-homecell-bulk-attendance.md
 * — nanti kalau delivered, swap implementation (keep hook signature).
 */
export type BulkAttendanceResult = {
  success: number;
  failed: number;
  errors: Array<{ kode: string; error: string }>;
};

export function useBulkAttendance(homecellId: string, scheduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kodes: string[]): Promise<BulkAttendanceResult> => {
      const results = await Promise.allSettled(
        kodes.map((kode) => recordAttendance(homecellId, scheduleId, kode)),
      );
      let success = 0;
      let failed = 0;
      const errors: BulkAttendanceResult['errors'] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          success += 1;
        } else {
          failed += 1;
          const msg = r.reason instanceof Error ? r.reason.message : 'Unknown error';
          errors.push({ kode: kodes[i], error: msg });
        }
      });
      return { success, failed, errors };
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['homecell', homecellId, 'schedule', scheduleId],
      });
      qc.invalidateQueries({ queryKey: ['homecell', homecellId, 'schedules'] });
    },
  });
}
