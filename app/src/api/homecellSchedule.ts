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

export async function listSchedules(
  homecellId: string,
  opts: ListOpts = {},
): Promise<HomecellSchedule[]> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  // BE delivered endpoint singular `/schedule` (sub-router mount path),
  // bukan plural `/schedules` yang ada di original spec. Per BE response
  // 2026-05-24 commit 7032e4c. Spec doc lupa di-update — align ke realita.
  //
  // Defensive: BE response shape bisa flat array atau wrapped paginated
  // object (e.g., { items: [], total: N }). Normalize ke array di sini
  // supaya consumer hook tidak perlu tahu detail BE wrap.
  const raw = await api.get<unknown>(
    `/admin/homecell/${homecellId}/schedule${q ? `?${q}` : ''}`,
  );
  if (Array.isArray(raw)) return raw as HomecellSchedule[];
  if (raw && typeof raw === 'object') {
    const obj = raw as { items?: unknown; data?: unknown };
    if (Array.isArray(obj.items)) return obj.items as HomecellSchedule[];
    if (Array.isArray(obj.data)) return obj.data as HomecellSchedule[];
  }
  return [];
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
