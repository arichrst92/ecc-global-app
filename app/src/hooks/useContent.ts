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
 *  (no auth), authenticated pakai /admin/news/:id (full data).
 *
 *  Field mapping: /public/news return `tanggal` (per BE), admin return
 *  `publishedAt`. Mobile NewsItem type expect `publishedAt` — map saat guest. */
export function useNewsDetail(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<NewsItem>({
    queryKey: ['news', 'detail', isGuest ? 'guest' : 'auth', idOrSlug],
    queryFn: async () => {
      if (!isGuest) return getNewsDetail(idOrSlug!);
      const pub = await publicNewsDetail(idOrSlug!);
      // Adapt PublicNewsDetail shape ke NewsItem (publishedAt from tanggal)
      return {
        id: pub.id,
        tipe: 'NEWS' as const,
        judul: pub.judul,
        slug: pub.slug,
        ringkasan: pub.ringkasan ?? '',
        konten: pub.konten,
        heroImageUrl: pub.heroImageUrl,
        tags: pub.tags,
        isPublished: true,
        publishedAt: pub.tanggal,
        viewCount: pub.viewCount,
        cabang: pub.cabang,
        author: pub.author ? { jemaat: { namaLengkap: pub.author.namaLengkap } } : undefined,
      } satisfies NewsItem;
    },
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}

/** Renungan detail — same dual-source pattern. RenunganItem already has
 *  both `tanggal` + `publishedAt`. Public BE return cuma tanggal — mirror
 *  ke publishedAt supaya UI yang baca either field tetap jalan. */
export function useRenunganDetail(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<RenunganItem>({
    queryKey: ['renungan', 'detail', isGuest ? 'guest' : 'auth', idOrSlug],
    queryFn: async () => {
      if (!isGuest) return getRenunganDetail(idOrSlug!);
      const pub = await publicRenunganDetail(idOrSlug!);
      return {
        id: pub.id,
        tipe: 'RENUNGAN' as const,
        judul: pub.judul,
        slug: pub.slug,
        ringkasan: pub.ringkasan ?? '',
        konten: pub.konten,
        heroImageUrl: null,
        isPublished: true,
        publishedAt: pub.tanggal,
        tanggal: pub.tanggal,
        ayatAlkitab: pub.ayatAlkitab ?? '',
      } satisfies RenunganItem;
    },
    enabled: !!idOrSlug,
    staleTime: 10 * 60_000,
  });
}
