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
 * TEMPORARY: limit bumped 50 → 200 sebagai workaround sampai BE deliver
 * endpoint dengan `from`/`to` query params. Per
 * `docs/backend-request-event-list-month-scoped.md`. Revert ke 50 setelah BE ready.
 *
 * @param options.includeExpired - kalau `true` tidak drop past events. Dipakai
 *   Calendar screen supaya user bisa navigate ke bulan lalu + lihat event lama.
 *   Default `false` untuk event tab list (upcoming only, current UX).
 */
export function useEventList(options: { includeExpired?: boolean } = {}) {
  const { includeExpired = false } = options;
  const { viewingCabangId, branch, isLoading } = useViewingBranch();
  const cabangId = viewingCabangId ?? branch?.id ?? null;
  return useQuery({
    queryKey: ['event', 'list', cabangId ?? 'all', includeExpired ? 'all-time' : 'upcoming'],
    // Fetch semua event published — TIDAK pass cabangId filter ke BE.
    // TODO: pakai from/to param begitu BE endpoint ready (revert limit ke 50).
    queryFn: () => listEvents({ limit: 200 }),
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    select: (data): EventListItem[] => {
      // Filter expired kecuali caller minta include (mis. Calendar past-months)
      const filtered = includeExpired ? data : data.filter((e) => !isEventExpired(e));
      if (!cabangId) return filtered; // belum login / branch belum resolved → show all
      return filtered.filter((e) => {
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
