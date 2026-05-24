import { useQuery } from '@tanstack/react-query';

import { listFulltimerSubRoles } from '@/api/role';
import type { FulltimerSubRole } from '@/types/role';

/**
 * Hook untuk daftar fulltimer sub-roles. Sumber pilihan picker di signup
 * kalau user mengaku staf fulltimer.
 *
 * Stable list (jarang berubah) — cache lama OK. Disabled by default,
 * caller enable hanya kalau user pilih isFulltimer=true (lazy fetch).
 *
 * Kalau BE belum implement (404), data akan undefined → UI fallback ke
 * disabled state dengan message "Fitur belum tersedia, hubungi admin".
 */
export function useFulltimerSubRoles(enabled: boolean) {
  return useQuery<FulltimerSubRole[]>({
    queryKey: ['fulltimer-sub-roles'],
    queryFn: listFulltimerSubRoles,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 jam — rarely changes
    retry: false, // graceful fallback, no retry
  });
}
