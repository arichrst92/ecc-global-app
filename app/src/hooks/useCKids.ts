/**
 * React Query hooks untuk CKids Tab.
 * Per BE notice ckids-mobile-tab 2026-08-01 + BE response 2026-08-03
 * (endpoint /admin/me/children-points + /admin/me/children-redeem-history live).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getMyChildrenPoints,
  listHadiah,
  getChildRedeemHistory,
} from '@/api/ckids';
import { listFamily } from '@/api/family';
import type { ChildGroupedBalance } from '@/types/ckids';
import type { FamilyRelation } from '@/types/family';

// Reuse family query key supaya invalidate dari useRegisterNewFamily /
// useLinkByKode juga reach useMyChildren cache (bukan cache terpisah).
const FAMILY_QUERY_KEY = ['family', 'list'] as const;

export const CKIDS_KEYS = {
  all: ['ckids'] as const,
  /** Alias ke FAMILY_QUERY_KEY — share cache dgn useMyFamily supaya
   *  invalidate dari mutation family (add/link/unlink) auto reach CKids
   *  tab. Fix M50: sebelumnya cache terpisah, add anak → CKids tetap kosong. */
  myChildren: (): readonly ['family', 'list'] => FAMILY_QUERY_KEY,
  childrenPoints: () => [...CKIDS_KEYS.all, 'children-points'] as const,
  hadiah: (cabangId?: string) => [...CKIDS_KEYS.all, 'hadiah', cabangId] as const,
  redeemHistory: (jemaatId: string) =>
    [...CKIDS_KEYS.all, 'redeem-history', jemaatId] as const,
};

/**
 * List anak dari family relations user (via existing /admin/me/family).
 *
 * Defensive filter — check EITHER:
 * - `role === 'CHILD'` (broad enum backward compat), ATAU
 * - `tipeRelasi.nama` include 'Anak' (post refactor 2026-08-02 granular:
 *   'Anak Laki-Laki', 'Anak Perempuan', 'Anak')
 *
 * Kalau BE inconsistent (mis. row lama role='CHILD' + row baru tipeRelasi
 * only), filter tetap catch keduanya.
 */
export function useMyChildren() {
  const query = useQuery({
    queryKey: CKIDS_KEYS.myChildren(),
    queryFn: listFamily,
    staleTime: 5 * 60_000,
  });

  const children = useMemo(
    () =>
      (query.data ?? []).filter((f: FamilyRelation) => {
        if (f.role === 'CHILD') return true;
        const tipeNama = f.tipeRelasi?.nama?.toLowerCase() ?? '';
        return tipeNama.includes('anak');
      }),
    [query.data],
  );

  return {
    ...query,
    children,
    isEmpty: !query.isPending && children.length === 0,
  };
}

/**
 * Get point balances semua anak — dedicated endpoint live 2026-08-03.
 * BE cache-control 60s — mobile bisa cache selaras.
 */
export function useMyChildrenPoints() {
  return useQuery({
    queryKey: CKIDS_KEYS.childrenPoints(),
    queryFn: getMyChildrenPoints,
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
 * History redeem per anak — dedicated parent-scoped endpoint live 2026-08-03.
 * BE guard verify jemaatId sebagai anak requester (via JemaatRelasi) → 403
 * kalau bukan.
 */
export function useChildRedeemHistory(jemaatId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: CKIDS_KEYS.redeemHistory(jemaatId ?? ''),
    queryFn: () => getChildRedeemHistory(jemaatId!, limit),
    enabled: !!jemaatId,
    staleTime: 60_000,
  });
}
