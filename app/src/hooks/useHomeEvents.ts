import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { addDaysIso, todayIso } from '@/utils/date';
import type { EventListItem } from '@/types/event';

/** Event preview untuk Home — top 3 upcoming, include global events.
 * Lihat useEventList untuk penjelasan filtering scope.
 *
 * Per `docs/be-update-2026-09-02-event-window-and-ministry-schedule.md`, pakai
 * server-side `from`/`to` window (today s/d today+30d) — mirror pattern
 * `useEventList` v2.2.0. Window sudah bounded dari BE (from >= today) jadi
 * tidak perlu lagi client-side `isEventExpired()` filter.
 */
export function useHomeEvents() {
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  const from = todayIso();
  const to = addDaysIso(30);
  return useQuery({
    queryKey: ['event', 'home-preview', cabangId ?? 'all', from, to],
    // Fetch lebih banyak untuk room filtering, lalu slice ke 3 di select
    queryFn: () => listEvents({ from, to, isPublished: true, limit: 20 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    select: (data): EventListItem[] => {
      // Scope ke cabang, lalu top 3.
      const filtered = !cabangId
        ? data
        : data.filter((e) => !e.cabang || e.cabang.id === cabangId);
      return filtered.slice(0, 3);
    },
  });
}
