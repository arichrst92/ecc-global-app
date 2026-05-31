/**
 * React Query persistence config — survive app restart via AsyncStorage.
 *
 * Goal: read-only data (news, renungan, events, jemaat list/detail, ibadah,
 * ministry) instant available di second launch. Stale data shown sambil
 * background refetch — prevent loading spinner spam saat flaky network.
 *
 * Settings:
 * - maxAge 24 jam — cache lebih lama di-drop, force fresh fetch
 * - buster = app version — schema change otomatis purge old cache
 * - throttleTime 1s — batch frequent writes (mis. saat list paging)
 *
 * Exclusions (jangan persist):
 * - maintenance-mode  → always fresh (gate decision)
 * - app-version       → 1h cache cukup, no point persist
 * - liveness-nonce-*  → one-shot, expired
 * - face-profile-*    → session-specific
 * - me/access         → RBAC sensitive
 *
 * Reference: https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient
 */

import type { Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'ecc-query-cache-v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam

/** Query keys yang TIDAK di-persist. Pattern match prefix dari queryKey[0]. */
const EXCLUDED_KEY_PREFIXES = new Set<string>([
  'maintenance-mode',
  'app-version',
  'app-config',
  'me-access',
  'auth-refresh',
]);

/** Decide apakah query worth persisting. Default true (whitelist via exclude). */
export function shouldDehydrateQuery(query: Query): boolean {
  // Hanya persist query yang berhasil fetch
  if (query.state.status !== 'success') return false;

  const firstKey = query.queryKey[0];
  if (typeof firstKey !== 'string') return false;

  if (EXCLUDED_KEY_PREFIXES.has(firstKey)) return false;

  return true;
}

/** App version sebagai cache buster — bump version → otomatis purge old cache.
 *  Prevent stale schema bugs setelah schema migration. */
function getBuster(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** Create persister yang persist ke AsyncStorage. */
export function createQueryPersister() {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: STORAGE_KEY,
    throttleTime: 1000,
    // Serialize/deserialize default JSON.stringify/parse — fine untuk data kita.
  });
}

/** Options untuk PersistQueryClientProvider. */
export const persistOptions = {
  maxAge: MAX_AGE_MS,
  buster: getBuster(),
  dehydrateOptions: {
    shouldDehydrateQuery,
  },
};

