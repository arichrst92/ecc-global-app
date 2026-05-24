import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import type { EventListItem } from '@/types/event';

/** Cek expired: tanggalSelesai (atau tanggalMulai fallback) < start of today. */
function isEventExpired(e: Pick<EventListItem, 'tanggalMulai' | 'tanggalSelesai'>): boolean {
  const endIso = e.tanggalSelesai ?? e.tanggalMulai;
  if (!endIso) return false;
  const endTs = new Date(endIso).getTime();
  if (isNaN(endTs)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return endTs < startOfToday.getTime();
}

/** Event preview untuk Home — top 3 upcoming, include global events.
 * Lihat useEventList untuk penjelasan filtering scope. */
export function useHomeEvents() {
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  return useQuery({
    queryKey: ['event', 'home-preview', cabangId ?? 'all'],
    // Fetch lebih banyak untuk room filtering, lalu slice ke 3 di select
    queryFn: () => listEvents({ limit: 20 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    select: (data): EventListItem[] => {
      // Drop expired dulu, lalu scope ke cabang, lalu top 3.
      const upcoming = data.filter((e) => !isEventExpired(e));
      const filtered = !cabangId
        ? upcoming
        : upcoming.filter((e) => !e.cabang || e.cabang.id === cabangId);
      return filtered.slice(0, 3);
    },
  });
}
