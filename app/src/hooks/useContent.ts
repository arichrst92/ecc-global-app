import { useQuery } from '@tanstack/react-query';

import {
  listNews,
  listRenungan,
  getNewsDetail,
  getRenunganDetail,
} from '@/api/content';
import {
  publicNewsList,
  publicRenunganList,
  publicNewsDetail,
  publicRenunganDetail,
} from '@/api/publicGuest';
import { useAuthStore } from '@/stores/auth.store';
import type { NewsItem, RenunganItem } from '@/types/content';
import type {
  PublicNewsItem,
  PublicRenunganItem,
} from '@/types/publicGuest';

/** Adapt PublicNewsItem (public/news list) → NewsItem shape. Missing fields
 *  (konten body, viewCount) diisi default — list view tidak butuh keduanya. */
function adaptPublicNews(pub: PublicNewsItem): NewsItem {
  return {
    id: pub.id,
    tipe: 'NEWS',
    judul: pub.judul,
    slug: pub.slug,
    ringkasan: pub.ringkasan ?? '',
    konten: '', // body only fetched on detail
    heroImageUrl: pub.heroImageUrl,
    tags: pub.tags,
    isPublished: true,
    publishedAt: pub.tanggal,
    cabang: pub.cabang,
    author: pub.author ? { jemaat: { namaLengkap: pub.author.namaLengkap } } : undefined,
  };
}

/** Adapt PublicRenunganItem → RenunganItem shape. */
function adaptPublicRenungan(pub: PublicRenunganItem): RenunganItem {
  return {
    id: pub.id,
    tipe: 'RENUNGAN',
    judul: pub.judul,
    slug: pub.slug,
    ringkasan: pub.ringkasan ?? '',
    konten: '',
    heroImageUrl: null,
    isPublished: true,
    publishedAt: pub.tanggal,
    tanggal: pub.tanggal,
    ayatAlkitab: pub.ayatAlkitab ?? '',
  };
}

/** News list — sinode-wide, paginated. Guest mode pakai /public/news
 *  (skipAuth), authenticated pakai /admin/news. */
export function useNewsList(limit = 20) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<NewsItem[]>({
    queryKey: ['news', 'list', isGuest ? 'guest' : 'auth', limit],
    queryFn: async () => {
      if (!isGuest) return listNews({ limit });
      const res = await publicNewsList({ limit });
      return res.data.map(adaptPublicNews);
    },
    staleTime: 5 * 60_000,
  });
}

/** Renungan list — sinode-wide, paginated, sorted desc by tanggal.
 *  Guest fallback ke /public/renungan. */
export function useRenunganList(limit = 30) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<RenunganItem[]>({
    queryKey: ['renungan', 'list', isGuest ? 'guest' : 'auth', limit],
    queryFn: async () => {
      if (!isGuest) return listRenungan({ limit });
      const res = await publicRenunganList({ limit });
      return res.data.map(adaptPublicRenungan);
    },
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
