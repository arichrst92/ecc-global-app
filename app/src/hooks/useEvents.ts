import { useQuery } from '@tanstack/react-query';

import {
  listEvents,
  getEventDetail,
  getMyParticipation,
  listMyDonations,
} from '@/api/event';
import { publicEventDetail } from '@/api/publicGuest';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { ApiError } from '@/types/api';
import type { EventDetail, EventParticipation, EventListItem } from '@/types/event';

/**
 * Cek apakah event sudah expired (event date < hari ini).
 * Pakai tanggalSelesai kalau ada (multi-day event), fallback ke tanggalMulai.
 * Threshold = start of today di local TZ — event yang berakhir hari ini
 * tetap tampil sampai habis hari.
 */
function isEventExpired(e: Pick<EventListItem, 'tanggalMulai' | 'tanggalSelesai'>): boolean {
  const endIso = e.tanggalSelesai ?? e.tanggalMulai;
  if (!endIso) return false; // defensive — kalau no date, jangan filter out
  const endTs = new Date(endIso).getTime();
  if (isNaN(endTs)) return false;
  // Start of today di local TZ — event berakhir hari ini (24:00) masih
  // dianggap belum expired. Comparison: end < startOfToday → expired.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return endTs < startOfToday.getTime();
}

/**
 * Event list dengan visibility scope inklusif + filter expired:
 * - **Global events** (sinode=null, cabang=null) → tampil untuk semua user
 * - **Sinode events** (sinode set, cabang=null) → tampil untuk semua cabang di sinode itu
 * - **Cabang events** (cabang set) → tampil hanya untuk user yang viewing cabang itu
 * - **Expired events** (tanggalSelesai < hari ini) → DROP. User cuma tertarik
 *   event yang masih akan datang / berlangsung hari ini.
 *
 * Implementation: fetch SEMUA event published, filter client-side. Lebih hemat
 * daripada 2x roundtrip (global + cabang) karena event count per sinode tipikal kecil.
 *
 * Future: kalau scale grow, request BE add `includeGlobal=true` + `from=` query
 * param supaya filtering jadi BE-side. Untuk sekarang client-filter cukup.
 */
export function useEventList() {
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  return useQuery({
    queryKey: ['event', 'list', cabangId ?? 'all'],
    // Fetch semua event published — TIDAK pass cabangId filter ke BE
    queryFn: () => listEvents({ limit: 50 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    select: (data): EventListItem[] => {
      // Drop expired SELALU (terlepas dari cabang scope)
      const upcoming = data.filter((e) => !isEventExpired(e));
      if (!cabangId) return upcoming; // belum login / branch belum resolved → show all upcoming
      return upcoming.filter((e) => {
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

/** Fetch user's participation di event ini sebagai standalone query.
 * Pakai post-mutation untuk refresh ringan tanpa refetch detail penuh.
 *
 * Returns null kalau BE balas NOT_FOUND (user belum daftar). Throws untuk error
 * lain. */
export function useMyParticipation(idOrSlug: string | undefined, enabled = true) {
  return useQuery<EventParticipation | null>({
    queryKey: ['event', 'my-participation', idOrSlug],
    queryFn: async () => {
      try {
        return await getMyParticipation(idOrSlug!);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NOT_FOUND') return null;
        throw err;
      }
    },
    enabled: !!idOrSlug && enabled,
    staleTime: 60_000, // 1 menit — refresh lebih sering daripada detail
  });
}

/**
 * Fetch user's donations untuk event ini. Per BE patch 2026-05-21l.
 * Returns donations[] + totalConfirmed (SUM nominal status=BAYAR).
 * Untuk NOMINAL_BEBAS bisa berisi banyak rows; untuk NOMINAL_TETAP biasanya 1.
 */
export function useMyDonations(idOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['event', 'my-donations', idOrSlug],
    queryFn: async () => {
      try {
        return await listMyDonations(idOrSlug!);
      } catch (err) {
        // NOT_FOUND = user belum punya participation → no donations
        if (err instanceof ApiError && err.code === 'NOT_FOUND') {
          return { donations: [], totalConfirmed: 0 };
        }
        throw err;
      }
    },
    enabled: !!idOrSlug && enabled,
    staleTime: 60_000,
  });
}
