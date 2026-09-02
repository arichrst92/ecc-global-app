import { useQuery } from '@tanstack/react-query';

import {
  listEvents,
  getEventDetail,
  listMineAndFamilyParticipations,
} from '@/api/event';
import { publicEventDetail } from '@/api/publicGuest';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { ApiError } from '@/types/api';
import { addDaysIso, todayIso } from '@/utils/date';
import type { EventDetail, EventParticipation, EventListItem } from '@/types/event';

/**
 * Event list dengan visibility scope inklusif:
 * - **Global events** (sinode=null, cabang=null) → tampil untuk semua user
 * - **Sinode events** (sinode set, cabang=null) → tampil untuk semua cabang di sinode itu
 * - **Cabang events** (cabang set) → tampil hanya untuk user yang viewing cabang itu
 *
 * Implementation: fetch event published dalam window `from`/`to`, filter
 * cabang-visibility client-side (event count per sinode tipikal kecil, jadi
 * masih lebih hemat daripada 2x roundtrip global+cabang).
 *
 * Per `docs/be-update-2026-09-02-event-window-and-ministry-schedule.md`, BE
 * sekarang support server-side date filter (`from`/`to`, overlap logic untuk
 * multi-day event) — menggantikan workaround v2.1.7 (`limit: 200` + client-side
 * `isEventExpired()` filter). Window bounded dari BE artinya tidak perlu lagi
 * double-filter expired di client.
 *
 * @param options.includeExpired - kalau `true`, fetch window mundur ke masa
 *   lalu juga (dipakai Calendar screen supaya user bisa navigate ke bulan
 *   lalu). Default `false` → window `today` s/d `today+90d` (event tab, upcoming
 *   only).
 * @param options.from - override window start (`YYYY-MM-DD`). Dipakai Calendar
 *   screen untuk scope per-bulan yang sedang dilihat.
 * @param options.to - override window end (`YYYY-MM-DD`).
 */
export function useEventList(
  options: { includeExpired?: boolean; from?: string; to?: string } = {},
) {
  const { includeExpired = false, from, to } = options;
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;

  // Default window kalau caller tidak pass from/to eksplisit:
  // - upcoming (event tab): today s/d today+90d
  // - includeExpired (calendar, no explicit month window): tidak ada default
  //   batas atas yang masuk akal untuk "all-time", jadi caller (Calendar
  //   screen) selalu pass from/to per-bulan sendiri.
  const effectiveFrom = from ?? (includeExpired ? undefined : todayIso());
  const effectiveTo = to ?? (includeExpired ? undefined : addDaysIso(90));

  return useQuery({
    queryKey: [
      'event',
      'list',
      cabangId ?? 'all',
      includeExpired ? 'all-time' : 'upcoming',
      effectiveFrom ?? 'none',
      effectiveTo ?? 'none',
    ],
    queryFn: () =>
      listEvents({
        from: effectiveFrom,
        to: effectiveTo,
        isPublished: true,
        // Bounded window dari BE — limit cuma perlu sebagai safety net kalau
        // window tidak di-set (all-time tanpa from/to eksplisit).
        limit: effectiveFrom && effectiveTo ? undefined : 200,
      }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    select: (data): EventListItem[] => {
      if (!cabangId) return data; // belum login / branch belum resolved → show all
      return data.filter((e) => {
        // Global event → tampil
        if (!e.cabang) return true;
        // Cabang-specific → tampil hanya kalau match viewing cabang
        return e.cabang.id === cabangId;
      });
    },
  });
}

/** Event detail by ID or slug. Guest mode pakai /public/event/:slug
 *  (no auth, no peserta info, no myParticipation), authenticated pakai
 *  /admin/event/:slug (full data + myParticipation field per BE patch
 *  2026-05-21i). */
export function useEventDetail(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<EventDetail>({
    queryKey: ['event', 'detail', isGuest ? 'guest' : 'auth', idOrSlug],
    queryFn: () =>
      isGuest
        ? (publicEventDetail(idOrSlug!) as unknown as Promise<EventDetail>)
        : getEventDetail(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch semua participation di event ini untuk self + family (JemaatRelasi
 * direct + spouse-transitive). Per BE update 2026-08-31 family-multi.
 *
 * Skip untuk guest mode — endpoint require auth.
 *
 * Returns empty array kalau BE balas NOT_FOUND (belum ada peserta di event
 * yang jemaatId-nya di family set). Throws untuk error lain.
 */
export function useMyEventParticipations(idOrSlug: string | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery<EventParticipation[]>({
    queryKey: ['event', 'mine-and-family', idOrSlug],
    queryFn: async () => {
      try {
        return await listMineAndFamilyParticipations(idOrSlug!);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NOT_FOUND') return [];
        throw err;
      }
    },
    enabled: !!idOrSlug && !isGuest,
    staleTime: 60_000, // 1 menit — sama kayak my-participation
  });
}

// useMyDonations REMOVED di v1.9.3 — donation flow full via web.
// Restore dari git kalau perlu read-only donation history di mobile lagi.
