import { useMutation, useQuery } from '@tanstack/react-query';

import {
  listScannerEvents,
  listScannerIbadah,
  checkinIbadah,
  checkinEvent,
  getIbadahCheckinStats,
  getEventCheckinStats,
} from '@/api/scanner';

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
