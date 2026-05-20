import { useQuery } from '@tanstack/react-query';

import { listEvents, getEventDetail } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';

/** Event list filtered by viewing cabang */
export function useEventList() {
  const { viewingCabangId, isLoading } = useViewingBranch();
  return useQuery({
    queryKey: ['event', 'list', viewingCabangId ?? 'all'],
    queryFn: () => listEvents({ cabangId: viewingCabangId ?? undefined, limit: 20 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000, // 5 menit
  });
}

/** Event detail by ID or slug */
export function useEventDetail(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['event', 'detail', idOrSlug],
    queryFn: () => getEventDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 5 * 60_000,
  });
}
