/**
 * App version check API — per BE patch 22b.
 * Public endpoint, accessible pre-login.
 *
 * BE return null fields kalau admin belum publish row di platform tsb —
 * mobile aman handle (just don't show prompt).
 */

import { api } from './client';
import type { AppVersionInfo } from '@/types/appVersion';

export type CheckOptions = {
  /** lowercase 'ios' atau 'android' */
  platform: 'ios' | 'android';
  /** Semver MAJOR.MINOR.PATCH (e.g. "1.0.0"). Kalau kosong, server tidak compute updateAvailable/forceUpdate. */
  currentVersion?: string;
};

export function checkAppVersion(opts: CheckOptions) {
  const params = new URLSearchParams({ platform: opts.platform });
  if (opts.currentVersion) params.set('currentVersion', opts.currentVersion);
  return api.get<AppVersionInfo>(`/public/app-version?${params}`, {
    skipAuth: true,
  });
}
