import { useQuery } from '@tanstack/react-query';

import { listEvents, getEventDetail, getMyParticipation } from '@/api/event';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { ApiError } from '@/types/api';
import type { EventParticipation } from '@/types/event';

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

/** Event detail by ID or slug — response includes `myParticipation` field
 * per BE patch 2026-05-21i. */
export function useEventDetail(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['event', 'detail', idOrSlug],
    queryFn: () => getEventDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 5 * 60_000,
  });
}

/** Fetch user's participation di event ini sebagai standalone query.
 * Pakai post-mutation untuk refresh ringan tanpa refetch detail penuh.
 *
 * Returns null kalau BE balas NOT_FOUND (user belum daftar). Throws untuk error
 * lain. */
export function useMyParticipation(idOrSlug: string | undefined, enabled = true) {
  return useQuery<EventParticipation | null>({
    queryKey: ['event', 'my-participation', idOrSlug],
    queryFn: async () => {
      try {
        return await getMyParticipation(idOrSlug!);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NOT_FOUND') return null;
        throw err;
      }
    },
    enabled: !!idOrSlug && enabled,
    staleTime: 60_000, // 1 menit — refresh lebih sering daripada detail
  });
}
