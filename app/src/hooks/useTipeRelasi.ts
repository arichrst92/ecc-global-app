/**
 * useTipeRelasi — fetch master data 11-12 tipe granular.
 * Cache 24 jam (staleTime) karena master data jarang berubah.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listTipeRelasi } from '@/api/tipeRelasi';
import { tipeCategoryKey, type TipeRelasi } from '@/types/tipeRelasi';

export const TIPE_RELASI_KEY = ['tipe-relasi', 'list'] as const;

export function useTipeRelasi() {
  return useQuery({
    queryKey: TIPE_RELASI_KEY,
    queryFn: listTipeRelasi,
    staleTime: 24 * 60 * 60_000, // 24h — master data
    gcTime: 24 * 60 * 60_000,
  });
}

/** Group tipe by kategori untuk section header di picker. */
export function useTipeRelasiGrouped() {
  const query = useTipeRelasi();
  const grouped = useMemo(() => {
    const items = query.data ?? [];
    const order: Array<
      'pasangan' | 'orangtua' | 'anak' | 'saudara' | 'kakeknenek' | 'cucu' | 'walilain'
    > = [
      'pasangan',
      'orangtua',
      'anak',
      'saudara',
      'kakeknenek',
      'cucu',
      'walilain',
    ];
    const buckets = new Map<string, TipeRelasi[]>();
    for (const t of items) {
      const key = tipeCategoryKey(t.nama);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    }
    return order
      .filter((k) => buckets.has(k))
      .map((k) => ({ kategori: k, items: buckets.get(k)! }));
  }, [query.data]);

  return { ...query, grouped };
}
