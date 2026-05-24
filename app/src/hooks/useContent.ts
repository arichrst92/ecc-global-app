import { useQuery } from '@tanstack/react-query';

import {
  listNews,
  listRenungan,
  getNewsDetail,
  getRenunganDetail,
} from '@/api/content';
import { publicNewsDetail, publicRenunganDetail } from '@/api/publicGuest';
import { useAuthStore } from '@/stores/auth.store';
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

/** News detail by id or slug. Guest mode pakai /public/news/:slug
 *  (no auth), authenticated pakai /admin/news/:id (full data). */
export function useNewsDetail(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<NewsItem>({
    queryKey: ['news', 'detail', isGuest ? 'guest' : 'auth', idOrSlug],
    queryFn: () =>
      isGuest
        ? (publicNewsDetail(idOrSlug!) as unknown as Promise<NewsItem>)
        : getNewsDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}

/** Renungan detail — same dual-source pattern. */
export function useRenunganDetail(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<RenunganItem>({
    queryKey: ['renungan', 'detail', isGuest ? 'guest' : 'auth', idOrSlug],
    queryFn: () =>
      isGuest
        ? (publicRenunganDetail(idOrSlug!) as unknown as Promise<RenunganItem>)
        : getRenunganDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}
