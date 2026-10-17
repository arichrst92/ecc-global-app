/**
 * Zona waktu cabang untuk mengonversi jam jadwal ibadah/event ke zona HP.
 * Urutan: cabang yang diminta → cabang yang sedang dilihat → default.
 */
import { useBranches } from '@/hooks/useBranches';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { DEFAULT_VENUE_TZ } from '@/utils/time';

export function useVenueTz(cabangId?: string | null, explicitTz?: string | null): string {
  const branches = useBranches();
  const { branch } = useViewingBranch();
  if (explicitTz) return explicitTz;
  const fromList = cabangId ? branches.data?.find((b) => b.id === cabangId)?.timezone : null;
  return fromList || branch?.timezone || DEFAULT_VENUE_TZ;
}
