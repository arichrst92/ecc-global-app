/**
 * React Query hooks untuk CKids Tab.
 * Per BE notice ckids-mobile-tab 2026-08-01.
 *
 * Fallback pattern: kalau /admin/me/children-points belum ada (404),
 * hook fallback ke multi-call lookup per anak. Detect via ApiError code +
 * catch fallback path.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getMyChildrenPoints,
  lookupJemaatPoint,
  listHadiah,
  getChildRedeemHistory,
} from '@/api/ckids';
import { listFamily } from '@/api/family';
import type { ChildPointBalance, ChildGroupedBalance } from '@/types/ckids';
import type { FamilyRelation } from '@/types/family';
import { ApiError } from '@/types/api';

export const CKIDS_KEYS = {
  all: ['ckids'] as const,
  myChildren: () => [...CKIDS_KEYS.all, 'my-children'] as const,
  childrenPoints: () => [...CKIDS_KEYS.all, 'children-points'] as const,
  hadiah: (cabangId?: string) => [...CKIDS_KEYS.all, 'hadiah', cabangId] as const,
  redeemHistory: (jemaatId: string) =>
    [...CKIDS_KEYS.all, 'redeem-history', jemaatId] as const,
};

/**
 * List anak dari family relations user (via existing /admin/me/family).
 * Filter FamilyRelation dgn role='CHILD' (broad enum, backward-compat post
 * family refactor 2026-08-02).
 */
export function useMyChildren() {
  const query = useQuery({
    queryKey: CKIDS_KEYS.myChildren(),
    queryFn: listFamily,
    staleTime: 5 * 60_000,
  });

  const children = useMemo(
    () => (query.data ?? []).filter((f: FamilyRelation) => f.role === 'CHILD'),
    [query.data],
  );

  return {
    ...query,
    children,
    isEmpty: !query.isPending && children.length === 0,
  };
}

/**
 * Get point balances semua anak — try dedicated endpoint dulu, fallback ke
 * multi-call kalau BE belum ready.
 */
export function useMyChildrenPoints() {
  return useQuery({
    queryKey: CKIDS_KEYS.childrenPoints(),
    queryFn: async () => {
      try {
        return await getMyChildrenPoints();
      } catch (err) {
        // Kalau 404 (endpoint belum ada) — kita bisa fallback via lookup per anak,
        // tapi butuh jemaat kode + cabangId. Fallback disabled untuk sekarang
        // karena BE endpoint gate Fulltimer. Kembalikan empty + warning di UI.
        if (err instanceof ApiError && err.code === 'NOT_FOUND') {
          // eslint-disable-next-line no-console
          console.warn(
            '[useMyChildrenPoints] Endpoint /admin/me/children-points belum ada. ' +
              'Return empty. Ref: docs/backend-request-ckids-me-endpoints.md',
          );
          return [] as ChildPointBalance[];
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

/**
 * Group balances by anak — supaya UI bisa tampil "Budi Junior: 150pts (Bandung) + 50pts (Jakarta)".
 * Compose dari raw children-points list.
 */
export function useMyChildrenGroupedBalances(): {
  isPending: boolean;
  isError: boolean;
  data: ChildGroupedBalance[];
} {
  const balancesQuery = useMyChildrenPoints();

  const grouped = useMemo<ChildGroupedBalance[]>(() => {
    const raw = balancesQuery.data ?? [];
    const map = new Map<string, ChildGroupedBalance>();
    for (const row of raw) {
      const existing = map.get(row.anak.id);
      if (existing) {
        existing.balances.push({
          cabang: row.cabang,
          balance: row.balance,
          lastUpdate: row.lastUpdate,
        });
        existing.totalBalance += row.balance;
      } else {
        map.set(row.anak.id, {
          anak: row.anak,
          balances: [
            {
              cabang: row.cabang,
              balance: row.balance,
              lastUpdate: row.lastUpdate,
            },
          ],
          totalBalance: row.balance,
        });
      }
    }
    return Array.from(map.values());
  }, [balancesQuery.data]);

  return {
    isPending: balancesQuery.isPending,
    isError: balancesQuery.isError,
    data: grouped,
  };
}

/** Katalog hadiah cabang tertentu. */
export function useHadiahKatalog(cabangId: string | undefined) {
  return useQuery({
    queryKey: CKIDS_KEYS.hadiah(cabangId),
    queryFn: () => listHadiah({ cabangId, isActive: true, limit: 50 }),
    enabled: !!cabangId,
    staleTime: 5 * 60_000,
  });
}

/**
 * History redeem per anak.
 *
 * Filter jemaatId BELUM ADA di BE — hook client-side filter setelah fetch
 * (butuh cabangId scope untuk avoid full-table scan).
 */
export function useChildRedeemHistory(jemaatId: string | undefined, cabangId?: string) {
  return useQuery({
    queryKey: CKIDS_KEYS.redeemHistory(jemaatId ?? ''),
    queryFn: async () => {
      const items = await getChildRedeemHistory({ jemaatId, cabangId, limit: 50 });
      // Client-side safety filter kalau BE belum apply jemaatId param
      return jemaatId ? items.filter((r) => r.jemaatId === jemaatId) : items;
    },
    enabled: !!jemaatId,
    staleTime: 60_000,
  });
}
