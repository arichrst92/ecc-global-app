/**
 * Hooks untuk guest-mode public endpoints. Cache 5-10 menit per BE recommendation.
 */

import { useQuery } from '@tanstack/react-query';

import {
  publicCabangRekening,
  publicEventList,
  publicIbadahCalendar,
  publicLocalMarketList,
  publicNewsDetail,
  publicNewsList,
  publicRenunganDetail,
  publicRenunganList,
} from '@/api/publicGuest';
import { addDaysIso, todayIso } from '@/utils/date';

const FIVE_MIN = 5 * 60_000;
const TEN_MIN = 10 * 60_000;
const THIRTY_MIN = 30 * 60_000;
const DEFAULT_IBADAH_RANGE_DAYS = 30;

export function usePublicIbadah(cabangId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-ibadah', cabangId ?? 'all'],
    queryFn: () =>
      publicIbadahCalendar({
        cabangId: cabangId ?? undefined,
        from: todayIso(),
        to: addDaysIso(DEFAULT_IBADAH_RANGE_DAYS),
      }),
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function usePublicEvents(cabangId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-event', cabangId ?? 'all'],
    queryFn: () => publicEventList({ cabangId: cabangId ?? undefined, limit: 20 }),
    staleTime: TEN_MIN,
    retry: 1,
  });
}

export function usePublicLocalMarket(opts?: {
  cabangId?: string;
  industri?: string;
}) {
  return useQuery({
    queryKey: ['public-local-market', opts?.cabangId ?? 'all', opts?.industri ?? 'all'],
    queryFn: () => publicLocalMarketList({ ...opts, limit: 20 }),
    staleTime: TEN_MIN,
    retry: 1,
  });
}

export function usePublicRekening(cabangId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-rekening', cabangId],
    queryFn: () => publicCabangRekening(cabangId!),
    enabled: !!cabangId,
    staleTime: TEN_MIN,
    retry: 1,
  });
}

export function usePublicNews(opts?: { cabangId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['public-news', opts?.cabangId ?? 'all', opts?.limit ?? 20],
    queryFn: () => publicNewsList(opts ?? {}),
    staleTime: THIRTY_MIN,
    retry: 1,
  });
}

export function usePublicNewsDetail(idOrSlug: string | null | undefined) {
  return useQuery({
    queryKey: ['public-news-detail', idOrSlug],
    queryFn: () => publicNewsDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: THIRTY_MIN,
    retry: 1,
  });
}

export function usePublicRenungan(opts?: { limit?: number }) {
  return useQuery({
    queryKey: ['public-renungan', opts?.limit ?? 20],
    queryFn: () => publicRenunganList(opts ?? {}),
    staleTime: THIRTY_MIN,
    retry: 1,
  });
}

export function usePublicRenunganDetail(idOrSlug: string | null | undefined) {
  return useQuery({
    queryKey: ['public-renungan-detail', idOrSlug],
    queryFn: () => publicRenunganDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: THIRTY_MIN,
    retry: 1,
  });
}
