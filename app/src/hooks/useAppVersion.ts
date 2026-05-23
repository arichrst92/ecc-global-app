import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQuery, type QueryClient } from '@tanstack/react-query';

import { checkAppVersion } from '@/api/appVersion';
import type { AppVersionInfo } from '@/types/appVersion';

const QUERY_KEY = ['app-version'] as const;

function currentPlatform(): 'ios' | 'android' {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * Hook untuk app version check. Mobile call ini di splash + reuse dari
 * MaintenanceGate / settings.
 *
 * Cache 1 jam (3600s) — fresh enough untuk force-update detection saat user
 * resume foreground, tidak terlalu sering supaya tidak spam BE.
 *
 * Tidak retry agresif — kalau gateway down, jangan amplify (user akan
 * detect issue dari maintenance modal atau network errors).
 */
export function useAppVersion() {
  return useQuery<AppVersionInfo>({
    queryKey: QUERY_KEY,
    queryFn: () =>
      checkAppVersion({
        platform: currentPlatform(),
        currentVersion: currentVersion(),
      }),
    staleTime: 60 * 60 * 1000, // 1 jam
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Pre-warm helper — dipanggil dari root layout splash supaya force-update
 * gate ready by time splash hides. Tanpa pre-warm, ada flash app → force
 * update modal pops (jarring).
 *
 * Silent fail — kalau request gagal, useAppVersion hook akan retry sendiri.
 */
export async function prefetchAppVersion(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEY,
      queryFn: () =>
        checkAppVersion({
          platform: currentPlatform(),
          currentVersion: currentVersion(),
        }),
      staleTime: 60 * 60 * 1000,
    });
  } catch {
    // Silent — useAppVersion hook akan handle retry/error
  }
}
