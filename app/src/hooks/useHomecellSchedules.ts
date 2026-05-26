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
