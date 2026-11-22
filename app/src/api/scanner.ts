/**
 * Scanner API — mobile-api-guide section 4.3, 5.5, 12.4, 12.5.
 * Volunteer check-in via QR scan kartu jemaat.
 */

import { api } from './client';
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
  WalkInReservasiPayload,
  WalkInReservasiResult,
  ActiveTodayReservasi,
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
  // Lewat API client: batas waktu (tidak menggantung saat sinyal buruk),
  // perpanjang token otomatis (401), dan header versi app.
  const r = await api.postWithMeta<IbadahCheckinResult, CheckinMeta>(`/admin/ibadah/${ibadahId}/checkin`, payload);
  return { data: r.data, meta: r.meta ?? { alreadyCheckedIn: false } };
}

type EventCheckinPayload = {
  kode: string;
  force?: boolean;
};

type EventCheckinResponse = {
  data: EventCheckinResult;
  meta: CheckinMeta;
};

/** POST /admin/event/:id/checkin — check-in event (lewat API client: timeout + refresh token). */
export async function checkinEvent(
  eventId: string,
  payload: EventCheckinPayload,
): Promise<EventCheckinResponse> {
  const r = await api.postWithMeta<EventCheckinResult, CheckinMeta>(`/admin/event/${eventId}/checkin`, payload);
  return { data: r.data, meta: r.meta ?? { alreadyCheckedIn: false } };
}

/** GET /admin/ibadah/:id/checkin/stats?tanggalIbadah=YYYY-MM-DD */
/** Tanpa `tanggalIbadah` → server memakai hari ini zona cabang (sama dengan tanggal scan). */
export function getIbadahCheckinStats(ibadahId: string, tanggalIbadah?: string | null) {
  return api.get<IbadahCheckinStats>(
    `/admin/ibadah/${ibadahId}/checkin/stats${tanggalIbadah ? `?tanggalIbadah=${tanggalIbadah}` : ''}`,
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

// ============================================================
// Walk-in universal (BE notice scanner-walkin-flow 2026-08-03)
// ============================================================

/**
 * POST /admin/reservasi/walk-in — universal scan endpoint (checkin/checkout/pickup).
 *
 * Behavior per action:
 * - checkin: upsert reservasi (create baru atau flip RESERVE→JOIN). Auto-gen
 *   kode + pickupCode kalau kids ibadah.
 * - checkout: cari reservasi existing (jemaat+ibadah+tanggal) → set checkedOutAt.
 * - pickup: cari kids reservasi existing → set pickedUpAt. Skip pickupCode validate.
 *
 * ⚠️ Existing BE accept `jemaatId` UUID. Mobile prefer `kode` — pending BE add
 * support per `backend-request-walkin-accept-kode.md`. Sampai BE deploy, mobile
 * pakai either flow: kalau punya jemaatId → send jemaatId; kalau cuma kode →
 * pending fallback strategy (mis. lookup dulu).
 */
export function walkInReservasi(payload: WalkInReservasiPayload) {
  // meta (server 2026-11): alreadyDone = sudah tercatat sebelumnya, walkIn = tanpa reservasi.
  return api.postWithMeta<WalkInReservasiResult, { alreadyDone?: boolean; walkIn?: boolean }>(
    '/admin/reservasi/walk-in',
    payload,
  );
}

/**
 * GET /admin/reservasi/active-today?jemaatId=X&mode=<checkout|pickup|none>
 *
 * Auto-detect ibadah aktif jemaat hari ini — dipakai untuk 1-tap checkout/pickup
 * di scanner walk-in flow.
 *
 * Mode filter:
 * - checkout: hanya reservasi ibadah requiresCheckout=true yg belum checkout
 * - pickup: hanya kids reservasi yg belum di-pickup
 * - none: semua reservasi JOIN hari ini
 */
export function getActiveToday(
  jemaatId: string,
  mode?: 'checkout' | 'pickup' | 'none',
) {
  const search = new URLSearchParams({ jemaatId });
  if (mode) search.set('mode', mode);
  return api.get<ActiveTodayReservasi[]>(
    `/admin/reservasi/active-today?${search.toString()}`,
  );
}

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

/** Satu jemaat yang sudah hadir — daftar di halaman scanner. */
export type ScanListItem = {
  id: string;
  jemaat: { id: string; namaLengkap: string; kode: string | null; fotoUrl: string | null };
  /** Waktu check-in (ISO). */
  at: string | null;
  /** SCAN | SELF | WALK_IN | LATE | MANUAL | null (data lama). */
  method: string | null;
  guest: boolean;
  /** Ibadah: discan oleh saya. */
  byMe: boolean;
  scannedBy: string | null;
  checkedOutAt: string | null;
  pickedUpAt: string | null;
  // ---- server ≥ 2026-11-22 ----
  /** HADIR | BELUM (reservasi / pendaftaran belum check-in). */
  status?: 'HADIR' | 'BELUM';
  guestSource?: string | null;
  /** Nama jemaat yang mengundang tamu. */
  invitedBy?: string | null;
  /** Ibadah anak: umur (tahun). */
  umur?: number | null;
  /** Event berbayar, belum hadir: status pembayaran. */
  payment?: 'LUNAS' | 'MENUNGGU' | 'BELUM_BAYAR' | null;
};

export type ScanListStatus = 'hadir' | 'belum';

/** GET /admin/ibadah/:id/checkin/list (server ≥ 2026-11-22) */
export function getIbadahCheckinList(ibadahId: string, tanggalIbadah: string, q?: string, status: ScanListStatus = 'hadir') {
  const qs = new URLSearchParams({ tanggalIbadah, status, ...(q ? { q } : {}) }).toString();
  return api.get<ScanListItem[]>(`/admin/ibadah/${ibadahId}/checkin/list?${qs}`);
}

/** GET /admin/event/:id/checkin/list (server ≥ 2026-11-22) */
export function getEventCheckinList(eventId: string, q?: string, status: ScanListStatus = 'hadir') {
  const qs = new URLSearchParams({ status, ...(q ? { q } : {}) }).toString();
  return api.get<ScanListItem[]>(`/admin/event/${eventId}/checkin/list?${qs}`);
}
