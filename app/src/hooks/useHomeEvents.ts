import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import type { EventListItem } from '@/types/event';

/** Event preview untuk Home — top 3, include global events.
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
      const filtered = !cabangId
        ? data
        : data.filter((e) => !e.cabang || e.cabang.id === cabangId);
      return filtered.slice(0, 3);
    },
  });
}
