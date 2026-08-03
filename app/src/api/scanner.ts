/**
 * Scanner API — mobile-api-guide section 4.3, 5.5, 12.4, 12.5.
 * Volunteer check-in via QR scan kartu jemaat.
 */

import { api } from './client';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import type {
  ScannerEvent,
  ScannerIbadah,
  IbadahCheckinResult,
  EventCheckinResult,
  CheckinMeta,
  IbadahCheckinStats,
  EventCheckinStats,
  ReservasiCheckoutResult,
  ReservasiPickupResult,
  ReservasiPickupPayload,
} from '@/types/scanner';

/** GET /admin/me/scanner-events — events yang user authorized scan */
export function listScannerEvents() {
  return api.get<ScannerEvent[]>('/admin/me/scanner-events');
}

/** GET /admin/me/scanner-ibadah — ibadah yang user authorized scan */
export function listScannerIbadah() {
  return api.get<ScannerIbadah[]>('/admin/me/scanner-ibadah');
}

type IbadahCheckinPayload = {
  kode: string;
  tanggalIbadah?: string; // default = today di BE
  force?: boolean;
};

type IbadahCheckinResponse = {
  data: IbadahCheckinResult;
  meta: CheckinMeta;
};

/**
 * POST /admin/ibadah/:id/checkin — check-in jemaat via kode QR.
 * Custom shape karena perlu akses meta (alreadyCheckedIn + walkIn).
 */
export async function checkinIbadah(
  ibadahId: string,
  payload: IbadahCheckinPayload,
): Promise<IbadahCheckinResponse> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${env.apiBaseUrl}/admin/ibadah/${ibadahId}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as
    | { success: true; data: IbadahCheckinResult; meta?: CheckinMeta }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    data: json.data,
    meta: json.meta ?? { alreadyCheckedIn: false },
  };
}

type EventCheckinPayload = {
  kode: string;
  force?: boolean;
};

type EventCheckinResponse = {
  data: EventCheckinResult;
  meta: CheckinMeta;
};

/** POST /admin/event/:id/checkin — check-in event */
export async function checkinEvent(
  eventId: string,
  payload: EventCheckinPayload,
): Promise<EventCheckinResponse> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${env.apiBaseUrl}/admin/event/${eventId}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as
    | { success: true; data: EventCheckinResult; meta?: CheckinMeta }
    | { success: false; error: { code: string; message: string } };
  if (!json.success) {
    throw new ApiError(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { code: json.error.code as any, message: json.error.message },
      res.status,
    );
  }
  return {
    data: json.data,
    meta: json.meta ?? { alreadyCheckedIn: false },
  };
}

/** GET /admin/ibadah/:id/checkin/stats?tanggalIbadah=YYYY-MM-DD */
export function getIbadahCheckinStats(ibadahId: string, tanggalIbadah: string) {
  return api.get<IbadahCheckinStats>(
    `/admin/ibadah/${ibadahId}/checkin/stats?tanggalIbadah=${tanggalIbadah}`,
  );
}

// ============================================================
// Modul 26 — Checkout scan (BE notice checkout-ibadah 2026-08-01)
// ============================================================

/**
 * POST /admin/reservasi/checkout — scan QR jemaat saat keluar ibadah.
 * Symmetric dgn /checkin. Idempotent — sudah checkout return same data +
 * message "Sudah checkout sebelumnya".
 *
 * Errors:
 * - 400: ibadah tidak require checkout, atau reservasi CANCEL, atau belum check-in
 * - 404: kode reservasi tidak ditemukan
 */
export function checkoutReservasi(kode: string) {
  return api.post<ReservasiCheckoutResult>('/admin/reservasi/checkout', { kode });
}

// ============================================================
// Modul 27 — Kids ibadah pickup (BE notice kids-ibadah-pickup 2026-08-01)
// ============================================================

/**
 * POST /admin/reservasi/pickup — admin verify pickup code + set pickedUpAt.
 * Guard: cuma reservasi dgn ibadah.isKidsIbadah=true, belum di-pickup, status=JOIN,
 * scope 24 jam terakhir.
 *
 * Errors:
 * - 400: multiple match untuk kode 6-digit — perlu kirim kodeReservasi juga
 * - 400: parent jemaat tidak ditemukan
 * - 400: kodeReservasi tidak match dgn pickup code
 * - 404: kode tidak ada / expired / sudah di-pickup
 */
export function pickupReservasi(payload: ReservasiPickupPayload) {
  return api.post<ReservasiPickupResult>('/admin/reservasi/pickup', payload);
}

/** GET /admin/event/:id/checkin/stats */
export function getEventCheckinStats(eventId: string) {
  return api.get<EventCheckinStats>(`/admin/event/${eventId}/checkin/stats`);
}
