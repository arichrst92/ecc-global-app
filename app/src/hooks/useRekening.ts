import { useQuery } from '@tanstack/react-query';

import { listRekeningCabang } from '@/api/cabang';
import { useViewingBranch } from '@/hooks/useViewingBranch';

/**
 * Fetch rekening untuk viewing cabang. Filter ke yang isActive=true di client
 * (BE return semua, mobile hanya tampil yang aktif untuk avoid bingung user).
 */
export function useRekening() {
  const { viewingCabangId, branch, isLoading: branchLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  return useQuery({
    queryKey: ['rekening', cabangId],
    queryFn: () => listRekeningCabang(cabangId!),
    enabled: !!cabangId && !branchLoading,
    staleTime: 5 * 60_000, // rekening data jarang berubah
    select: (data) => data.filter((r) => r.isActive),
  });
}
