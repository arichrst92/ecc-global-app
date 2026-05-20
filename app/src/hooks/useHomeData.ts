import { useQuery } from '@tanstack/react-query';

import { getMyStats } from '@/api/me';
import { getIbadahCalendar } from '@/api/ibadah';
import { listNews, listRenungan } from '@/api/content';
import { useAuthStore } from '@/stores/auth.store';
import type { IbadahOccurrence } from '@/types/ibadah';

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stats user — streak hadir, attended count */
export function useMyStats() {
  return useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => getMyStats(),
    staleTime: 5 * 60_000, // 5 menit
    retry: 1,
  });
}

/** Ibadah hari ini di cabang home user. Return null kalau tidak ada. */
export function useTodayServices() {
  const cabangId = useAuthStore((s) => s.user?.id /* TODO: should be cabangId */);
  // Actually user object has cabang implicitly via jemaatId — we don't store cabangId di User type.
  // For now omit cabangId filter — return semua cabang ibadah hari ini, lalu mobile filter di client.
  // M2.5 ganti dengan branch context cabangId.
  const today = todayIso();
  return useQuery<IbadahOccurrence[]>({
    queryKey: ['ibadah', 'calendar', today, today, cabangId ?? 'all'],
    queryFn: () => getIbadahCalendar({ from: today, to: today }),
    staleTime: 10 * 60_000, // 10 menit
    retry: 1,
  });
}

/** Ibadah 1 minggu ke depan (untuk ibadah tab pertama load) */
export function useWeekServices() {
  const from = todayIso();
  const to = addDaysIso(7);
  return useQuery<IbadahOccurrence[]>({
    queryKey: ['ibadah', 'calendar', from, to],
    queryFn: () => getIbadahCalendar({ from, to }),
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** Renungan terbaru (untuk Home preview) */
export function useLatestRenungan() {
  return useQuery({
    queryKey: ['renungan', 'latest'],
    queryFn: () => listRenungan({ limit: 1 }),
    staleTime: 30 * 60_000, // 30 menit
    retry: 1,
    select: (data) => data[0] ?? null,
  });
}

/** News terbaru (3 latest untuk Home preview) */
export function useLatestNews() {
  return useQuery({
    queryKey: ['news', 'latest', 3],
    queryFn: () => listNews({ limit: 3 }),
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
