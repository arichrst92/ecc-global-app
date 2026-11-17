import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { addDaysIso, todayIso } from '@/utils/date';
import type { EventListItem } from '@/types/event';

/** Event preview untuk Home — 6 event terdekat, include global events.
 * Lihat useEventList untuk penjelasan filtering scope.
 *
 * Per `docs/be-update-2026-09-02-event-window-and-ministry-schedule.md`, pakai
 * server-side `from`/`to` window (today s/d today+30d) — mirror pattern
 * `useEventList` v2.2.0. Window sudah bounded dari BE (from >= today) jadi
 * tidak perlu lagi client-side `isEventExpired()` filter.
 */
/** Jumlah kartu "Event mendatang" di Beranda. */
const HOME_EVENTS = 6;

export function useHomeEvents() {
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  const from = todayIso();
  // 90 hari (sama dengan tab Event) supaya 6 kartu terisi walau bulan ini sepi.
  const to = addDaysIso(90);
  return useQuery({
    queryKey: ['event', 'home-preview', cabangId ?? 'all', from, to],
    // Ambil lebih banyak untuk penyaringan cabang, lalu ambil HOME_EVENTS di select.
    queryFn: () => listEvents({ from, to, isPublished: true, limit: 30 }),
    enabled: !isLoading,
    staleTime: 60_000,
    refetchOnMount: 'always',
    select: (data): EventListItem[] => {
      // Scope ke cabang, lalu 6 terdekat.
      const filtered = !cabangId
        ? data
        : data.filter((e) => !e.cabang || e.cabang.id === cabangId);
      return filtered.slice(0, HOME_EVENTS);
    },
  });
}
