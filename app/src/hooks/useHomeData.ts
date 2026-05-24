import { useQuery } from '@tanstack/react-query';

import { getMyStats } from '@/api/me';
import { getIbadahCalendar } from '@/api/ibadah';
import { listNews, listRenungan } from '@/api/content';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import type { IbadahOccurrence } from '@/types/ibadah';
import { todayIso, addDaysIso } from '@/utils/date';

/** Stats user — streak hadir, attended count. Personal data, BUKAN cabang-specific. */
export function useMyStats() {
  return useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => getMyStats(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Ibadah hari ini, di-filter by viewing cabang.
 * Kalau viewing != home, hasilnya adalah ibadah cabang yang sedang di-view.
 *
 * Query key version 'v2' (bump 2026-05-24 saat BE add `linkOnline` field
 * ke /admin/ibadah/calendar) — force invalidate AsyncStorage cache lama
 * yang sebelum BE deploy. Tanpa bump, persister kembali cache stale
 * tanpa field linkOnline.
 */
export function useTodayServices() {
  const { viewingCabangId, isLoading } = useViewingBranch();
  const today = todayIso();
  return useQuery<IbadahOccurrence[]>({
    queryKey: ['ibadah', 'calendar', 'v2', today, today, viewingCabangId ?? 'all'],
    queryFn: () => getIbadahCalendar({ from: today, to: today, cabangId: viewingCabangId ?? undefined }),
    enabled: !isLoading, // wait until viewing branch resolved
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** Ibadah 1 minggu ke depan, filtered by viewing cabang. Key v2 — see comment di useTodayServices. */
export function useWeekServices() {
  const { viewingCabangId, isLoading } = useViewingBranch();
  const from = todayIso();
  const to = addDaysIso(7);
  return useQuery<IbadahOccurrence[]>({
    queryKey: ['ibadah', 'calendar', 'v2', from, to, viewingCabangId ?? 'all'],
    queryFn: () => getIbadahCalendar({ from, to, cabangId: viewingCabangId ?? undefined }),
    enabled: !isLoading,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** Renungan terbaru — sinode-wide content, TIDAK filter by cabang */
export function useLatestRenungan() {
  return useQuery({
    queryKey: ['renungan', 'latest'],
    queryFn: () => listRenungan({ limit: 1 }),
    staleTime: 30 * 60_000,
    retry: 1,
    select: (data) => data[0] ?? null,
  });
}

/** News terbaru — TODO: filter by cabang nanti kalau BE support cabangId query */
export function useLatestNews() {
  return useQuery({
    queryKey: ['news', 'latest', 3],
    queryFn: () => listNews({ limit: 3 }),
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
