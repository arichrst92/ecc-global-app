import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listScannerEvents,
  listScannerIbadah,
  checkinIbadah,
  checkinEvent,
  getIbadahCheckinStats,
  getEventCheckinStats,
  checkoutReservasi,
  pickupReservasi,
  walkInReservasi,
  getActiveToday,
} from '@/api/scanner';
import type {
  ReservasiPickupPayload,
  WalkInReservasiPayload,
} from '@/types/scanner';

/** List event yang user authorized scan */
export function useScannerEvents() {
  return useQuery({
    queryKey: ['scanner', 'events'],
    queryFn: listScannerEvents,
    staleTime: 5 * 60_000,
  });
}

/** List ibadah yang user authorized scan */
export function useScannerIbadah() {
  return useQuery({
    queryKey: ['scanner', 'ibadah'],
    queryFn: listScannerIbadah,
    staleTime: 5 * 60_000,
  });
}

/** Mutation check-in ibadah */
export function useCheckinIbadah(ibadahId: string) {
  return useMutation({
    mutationFn: (payload: { kode: string; tanggalIbadah?: string; force?: boolean }) =>
      checkinIbadah(ibadahId, payload),
  });
}

/** Mutation check-in event */
export function useCheckinEvent(eventId: string) {
  return useMutation({
    mutationFn: (payload: { kode: string; force?: boolean }) =>
      checkinEvent(eventId, payload),
  });
}

/** Live stats polling untuk ibadah scanner. Default poll 10s saat enabled. */
export function useIbadahCheckinStats(
  ibadahId: string,
  tanggalIbadah: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['scanner', 'stats', 'ibadah', ibadahId, tanggalIbadah],
    queryFn: () => getIbadahCheckinStats(ibadahId, tanggalIbadah),
    enabled: !!ibadahId && !!tanggalIbadah && enabled,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/** Live stats polling untuk event scanner */
export function useEventCheckinStats(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ['scanner', 'stats', 'event', eventId],
    queryFn: () => getEventCheckinStats(eventId),
    enabled: !!eventId && enabled,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/**
 * Mutation checkout reservasi ibadah (Modul 26).
 * Auto-invalidate stats supaya counter update.
 */
export function useCheckoutReservasi(ibadahId: string, tanggalIbadah?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kode: string) => checkoutReservasi(kode),
    onSuccess: () => {
      if (tanggalIbadah) {
        queryClient.invalidateQueries({
          queryKey: ['scanner', 'stats', 'ibadah', ibadahId, tanggalIbadah],
        });
      }
    },
  });
}

/**
 * Mutation pickup anak (Modul 27).
 * Verify pickup code 6-digit → set pickedUpAt di reservasi.
 */
export function usePickupReservasi(ibadahId: string, tanggalIbadah?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReservasiPickupPayload) => pickupReservasi(payload),
    onSuccess: () => {
      if (tanggalIbadah) {
        queryClient.invalidateQueries({
          queryKey: ['scanner', 'stats', 'ibadah', ibadahId, tanggalIbadah],
        });
      }
    },
  });
}

/**
 * Walk-in universal (Modul walk-in flow) — checkin/checkout/pickup 1 endpoint.
 * Per BE notice scanner-walkin-flow 2026-08-03.
 */
export function useWalkInReservasi(ibadahId?: string, tanggalIbadah?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WalkInReservasiPayload) => walkInReservasi(payload),
    onSuccess: () => {
      if (ibadahId && tanggalIbadah) {
        queryClient.invalidateQueries({
          queryKey: ['scanner', 'stats', 'ibadah', ibadahId, tanggalIbadah],
        });
      }
    },
  });
}

/**
 * Get active reservasi today untuk jemaat spesifik. Dipakai untuk
 * auto-detect ibadah aktif saat mode checkout/pickup.
 *
 * Fresh fetch on-demand — bukan long-lived cache karena data cepat berubah
 * (check-in/checkout tambah/kurang list).
 */
export function useActiveToday(
  jemaatId: string | undefined,
  mode?: 'checkout' | 'pickup' | 'none',
  enabled = true,
) {
  return useQuery({
    queryKey: ['scanner', 'active-today', jemaatId, mode],
    queryFn: () => getActiveToday(jemaatId!, mode),
    enabled: !!jemaatId && enabled,
    staleTime: 10_000,
  });
}
