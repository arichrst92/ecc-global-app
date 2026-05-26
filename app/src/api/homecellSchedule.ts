/**
 * Homecell Schedule + Attendance API client.
 * Per docs/backend-request-homecell-schedule-attendance.md.
 *
 * Status pending BE deploy — endpoints akan 404 sampai BE rollout. Caller
 * handle 404 gracefully (empty state, no crash).
 */

import { api } from './client';
import type {
  HomecellSchedule,
  HomecellScheduleDetail,
  CreateSchedulePayload,
  ScanAttendanceResponse,
} from '@/types/homecellSchedule';

type ListOpts = { from?: string; to?: string; limit?: number };

export function listSchedules(
  homecellId: string,
  opts: ListOpts = {},
): Promise<HomecellSchedule[]> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  return api.get<HomecellSchedule[]>(
    `/admin/homecell/${homecellId}/schedules${q ? `?${q}` : ''}`,
  );
}

export function getScheduleDetail(
  homecellId: string,
  scheduleId: string,
): Promise<HomecellScheduleDetail> {
  return api.get<HomecellScheduleDetail>(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}`,
  );
}

export function createSchedule(
  homecellId: string,
  payload: CreateSchedulePayload,
): Promise<HomecellSchedule> {
  return api.post<HomecellSchedule>(
    `/admin/homecell/${homecellId}/schedule`,
    payload,
  );
}

export function deleteSchedule(
  homecellId: string,
  scheduleId: string,
): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}`,
  );
}

export function recordAttendance(
  homecellId: string,
  scheduleId: string,
  kode: string,
): Promise<ScanAttendanceResponse> {
  return api.post<ScanAttendanceResponse>(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}/attendance`,
    { kode },
  );
}

export function deleteAttendance(
  homecellId: string,
  scheduleId: string,
  attendanceId: string,
): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(
    `/admin/homecell/${homecellId}/schedule/${scheduleId}/attendance/${attendanceId}`,
  );
}
