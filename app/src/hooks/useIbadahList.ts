import { useQuery } from '@tanstack/react-query';

import { listIbadah } from '@/api/ibadah';
import { useViewingBranch } from '@/hooks/useViewingBranch';

/**
 * Ibadah list — fetch semua ibadah di cabang yang lagi di-view.
 * Dipakai di calendar screen untuk show dots per tanggal.
 */
export function useIbadahList() {
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  return useQuery({
    queryKey: ['ibadah', 'list', cabangId ?? 'all'],
    queryFn: () => listIbadah({ cabangId: cabangId ?? undefined, limit: 100 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
  });
}
