import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listCabang } from '@/api/cabang';
import { storage } from '@/utils/storage';
import type { Cabang } from '@/types/cabang';

const CACHE_KEY = 'ecc.branches';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam
const QUERY_KEY = ['branches', 'active'] as const;

type CachedPayload = {
  data: Cabang[];
  fetchedAt: number;
};

async function readCache(): Promise<CachedPayload | null> {
  try {
    const raw = await storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed.data || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(data: Cabang[]) {
  try {
    const payload: CachedPayload = { data, fetchedAt: Date.now() };
    await storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Hook untuk fetch cabang list dengan two-layer cache:
 * 1. React Query in-memory (stale 24 jam → hit cache, no refetch)
 * 2. Persistent storage (secure-store / localStorage) untuk warm boot
 *
 * Strategy:
 * - Mount: hydrate React Query dari persistent cache (instant render)
 * - Background: fetch dari API → update cache + storage
 * - Stale: re-fetch saat user pull-to-refresh atau cache > 24 jam
 */
export function useBranches() {
  const queryClient = useQueryClient();

  // Hydrate React Query dari storage cache pada mount
  useEffect(() => {
    let cancelled = false;
    readCache().then((cached) => {
      if (cancelled) return;
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        // Cache fresh — set as initial data
        queryClient.setQueryData<Cabang[]>(QUERY_KEY, cached.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await listCabang({ isActive: 'true' });
      // Persist ke storage setelah fetch success
      await writeCache(data);
      return data;
    },
    staleTime: CACHE_TTL_MS,
    retry: 2,
  });

  return query;
}

/**
 * Helper: prefetch cabang saat app launch (di root _layout) supaya
 * picker langsung instant saat user buka signup.
 */
export async function prefetchBranches(queryClient: ReturnType<typeof useQueryClient>) {
  // Hydrate dari storage dulu
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    queryClient.setQueryData<Cabang[]>(QUERY_KEY, cached.data);
    return;
  }

  // Atau fetch fresh
  try {
    const data = await listCabang({ isActive: 'true' });
    queryClient.setQueryData<Cabang[]>(QUERY_KEY, data);
    await writeCache(data);
  } catch {
    // Silent fail — picker akan fetch sendiri saat dibuka, atau fallback
  }
}
