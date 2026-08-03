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
} from '@/api/scanner';
import type { ReservasiPickupPayload } from '@/types/scanner';

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
