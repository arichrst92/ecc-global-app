import { useQuery, type QueryClient } from '@tanstack/react-query';

import { getAppConfig } from '@/api/appConfig';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/types/appConfig';

const QUERY_KEY = ['app-config'] as const;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Hook untuk fetch tune-able app config dari BE.
 *
 * Cache 1 jam — admin update threshold/sampling via portal, mobile pick up
 * di refetch berikutnya (saat foreground resume atau next session).
 *
 * Fallback ke `APP_CONFIG_DEFAULTS` kalau fetch gagal — mobile tidak blocked.
 */
export function useAppConfig(): { data: AppConfig; isLoading: boolean } {
  const query = useQuery<AppConfig>({
    queryKey: QUERY_KEY,
    queryFn: getAppConfig,
    staleTime: ONE_HOUR_MS,
    refetchOnWindowFocus: true,
    // retry 0 — kalau gagal, fallback ke APP_CONFIG_DEFAULTS langsung.
    // Retry tidak menambah value (defaults sudah safe) tapi spam network +
    // error logs. Next refetch (window focus / 1h stale) akan coba lagi.
    retry: false,
  });
  return {
    data: query.data ?? APP_CONFIG_DEFAULTS,
    isLoading: query.isLoading,
  };
}

/**
 * Sync accessor — pakai cached data dari React Query atau fallback default.
 * Untuk service-layer code (mis. telemetry.ts) yang tidak React-hookable.
 *
 * Caller harus pass queryClient supaya bisa baca cache. Returns default
 * kalau cache empty.
 */
export function getAppConfigSync(queryClient: QueryClient): AppConfig {
  return queryClient.getQueryData<AppConfig>(QUERY_KEY) ?? APP_CONFIG_DEFAULTS;
}

/**
 * Pre-warm helper — dipanggil dari root layout splash supaya
 * lowConfidenceWarnThreshold + telemetrySamplingRate ready di first event.
 */
export async function prefetchAppConfig(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEY,
      queryFn: getAppConfig,
      staleTime: ONE_HOUR_MS,
    });
  } catch {
    // Silent — useAppConfig akan retry, atau pakai DEFAULTS
  }
}
