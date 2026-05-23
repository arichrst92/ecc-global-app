import { useQuery } from '@tanstack/react-query';

import { getMaintenanceStatus } from '@/api/maintenance';

/**
 * Polling hook untuk maintenance mode global.
 *
 * Strategy (per BE handoff):
 * - Poll setiap 60 detik selama foreground
 * - Refetch on window focus (foreground resume)
 * - Tidak retry agresif (retry: 1) — kalau gateway down, jangan amplify
 * - staleTime 30s — fresh data didapat <60s di app lifecycle
 *
 * Mobile harus render <MaintenanceModal> kalau data.isEnabled === true.
 */
export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: getMaintenanceStatus,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  });
}
