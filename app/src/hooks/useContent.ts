import { useQuery } from '@tanstack/react-query';

import {
  listNews,
  listRenungan,
  getNewsDetail,
  getRenunganDetail,
} from '@/api/content';
import type { NewsItem, RenunganItem } from '@/types/content';

/** News list — sinode-wide, paginated */
export function useNewsList(limit = 20) {
  return useQuery<NewsItem[]>({
    queryKey: ['news', 'list', limit],
    queryFn: () => listNews({ limit }),
    staleTime: 5 * 60_000,
  });
}

/** Renungan list — sinode-wide, paginated, sorted desc by tanggal */
export function useRenunganList(limit = 30) {
  return useQuery<RenunganItem[]>({
    queryKey: ['renungan', 'list', limit],
    queryFn: () => listRenungan({ limit }),
    staleTime: 5 * 60_000,
  });
}

/** News detail by id or slug */
export function useNewsDetail(idOrSlug: string | undefined) {
  return useQuery<NewsItem>({
    queryKey: ['news', 'detail', idOrSlug],
    queryFn: () => getNewsDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}

/** Renungan detail by id or slug */
export function useRenunganDetail(idOrSlug: string | undefined) {
  return useQuery<RenunganItem>({
    queryKey: ['renungan', 'detail', idOrSlug],
    queryFn: () => getRenunganDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}
