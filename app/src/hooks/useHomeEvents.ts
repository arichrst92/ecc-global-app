import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';

/** Event preview untuk Home — 3 latest, filtered by viewing cabang */
export function useHomeEvents() {
  const { viewingCabangId, isLoading } = useViewingBranch();
  return useQuery({
    queryKey: ['event', 'home-preview', viewingCabangId ?? 'all'],
    queryFn: () => listEvents({ cabangId: viewingCabangId ?? undefined, limit: 3 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
  });
}
