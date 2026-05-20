import { useQuery } from '@tanstack/react-query';

import { getMyProfile } from '@/api/me';
import { useBranches } from '@/hooks/useBranches';
import { useBranchStore } from '@/stores/branch.store';
import type { Cabang } from '@/types/cabang';

/**
 * Get home branch user dari /admin/me (cached 5 menit).
 * Belum ada cabangId di User auth response, jadi fetch via /admin/me.
 */
export function useHomeBranch() {
  return useQuery({
    queryKey: ['me', 'profile'],
    queryFn: () => getMyProfile(),
    staleTime: 5 * 60_000,
    select: (data) => ({
      id: data.cabang.id,
      nama: data.cabang.nama,
      kode: data.cabang.kode,
    }),
  });
}

/**
 * Cabang yang sedang di-view (default = home branch).
 * Return object lengkap dari /auth/cabang list.
 */
export function useViewingBranch(): {
  branch: Cabang | null;
  isHome: boolean;
  homeCabangId: string | null;
  viewingCabangId: string | null;
  isLoading: boolean;
} {
  const viewingCabangId = useBranchStore((s) => s.viewingCabangId);
  const homeBranchQuery = useHomeBranch();
  const branchesQuery = useBranches();

  const homeCabangId = homeBranchQuery.data?.id ?? null;
  const effectiveCabangId = viewingCabangId ?? homeCabangId;
  const branches = branchesQuery.data ?? [];
  const branch = effectiveCabangId
    ? branches.find((b) => b.id === effectiveCabangId) ?? null
    : null;

  return {
    branch,
    isHome: !viewingCabangId || viewingCabangId === homeCabangId,
    homeCabangId,
    viewingCabangId: effectiveCabangId,
    isLoading: homeBranchQuery.isPending || branchesQuery.isPending,
  };
}
