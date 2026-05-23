import { useQuery, type QueryClient } from '@tanstack/react-query';

import { getMaintenanceStatus } from '@/api/maintenance';

const QUERY_KEY = ['maintenance-mode'] as const;

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
    queryKey: QUERY_KEY,
    queryFn: getMaintenanceStatus,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Pre-warm helper — dipanggil dari root layout splash supaya decision
 * maintenance gate ready by time splash hides. Tanpa pre-warm, ada flash
 * app → maintenance modal pops (jarring UX).
 *
 * Silent fail — kalau request gagal, useMaintenanceMode hook akan retry
 * sendiri setelah mount.
 */
export async function prefetchMaintenance(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEY,
      queryFn: getMaintenanceStatus,
      staleTime: 30_000,
    });
  } catch {
    // Silent — useMaintenanceMode hook akan handle retry/error
  }
}
