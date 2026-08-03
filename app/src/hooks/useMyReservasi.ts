/**
 * Hook untuk /admin/me/reservasi — parent-scoped reservasi user (self + anak).
 * Endpoint live 2026-08-03 per BE response
 * `backend-request-me-reservasi-pickup-code.md`.
 */

import { useQuery } from '@tanstack/react-query';

import { listMyReservasi } from '@/api/me';
import type { ListMyReservasiParams } from '@/types/ibadah';

export const MY_RESERVASI_KEYS = {
  all: ['my-reservasi'] as const,
  list: (params: ListMyReservasiParams) => [...MY_RESERVASI_KEYS.all, params] as const,
};

/**
 * List reservasi active user. Default activeOnly=true (24 jam terakhir).
 * Include reservasi self + reservasi anak yg di-checkin user.
 *
 * Kids-focused UX: kalau reservasi punya `pickupCode` + `pickedUpAt=null`,
 * parent perlu tunjukkan kode ke admin saat jemput anak.
 */
export function useMyReservasi(params: ListMyReservasiParams = { activeOnly: true }) {
  return useQuery({
    queryKey: MY_RESERVASI_KEYS.list(params),
    queryFn: () => listMyReservasi(params),
    staleTime: 30_000,
  });
}
