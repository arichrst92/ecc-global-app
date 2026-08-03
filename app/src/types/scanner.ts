// Scanner types per mobile-api-guide section 4.3, 5.5, 12.4, 12.5

/** Scanner-authorized ibadah dari GET /admin/me/scanner-ibadah */
export type ScannerIbadah = {
  ibadahId: string;
  nama: string;
  cabangId: string;
  tipeJadwal: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ADHOC';
  hari?: string | null;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  kategori?: string | null;
  pelayananNama: string;
  role: string;
  level: number;
  /** Toggle wajib checkout per ibadah — trigger mode Checkout di scanner.
   *  Per BE notice Modul 26 2026-08-01. */
  requiresCheckout?: boolean;
  /** Flag ibadah anak — trigger badge 🧒 + mode Pickup di scanner.
   *  Per BE notice Modul 27 2026-08-01. */
  isKidsIbadah?: boolean;
};

/** Scanner-authorized event dari GET /admin/me/scanner-events */
export type ScannerEvent = {
  eventId: string;
  judul: string;
  slug: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  pelayananNama: string;
  role: string;
  level: number;
};

/** Check-in result jemaat info (subset) */
export type CheckinJemaat = {
  id: string;
  namaLengkap: string;
  fotoUrl?: string | null;
  noHp?: string | null;
};

/** Response data dari POST /admin/ibadah/:id/checkin */
export type IbadahCheckinResult = {
  id: string;
  ibadahId: string;
  jemaatId: string;
  tanggalIbadah: string;
  status: 'JOIN' | 'BATAL' | 'COMPLETED';
  kode: string;
  joinedAt: string;
  jemaat: CheckinJemaat;
  /** Kalau ibadah kids, auto-populate 6-digit pickup code untuk parent.
   *  Per BE notice Modul 27 2026-08-01. Backward compat: mobile lama ignore. */
  pickupCode?: string | null;
};

/** Response data dari POST /admin/reservasi/checkout — Modul 26. */
export type ReservasiCheckoutResult = {
  id: string;
  kode: string;
  status: 'JOIN' | 'COMPLETED';
  joinedAt: string;
  checkedOutAt: string;
  checkedOutBy: string;
  jemaatId: string;
  ibadahId: string;
};

/** Response data dari POST /admin/reservasi/pickup — Modul 27. */
export type ReservasiPickupResult = {
  reservasi: {
    id: string;
    kode: string;
    pickedUpAt: string;
    pickedUpByJemaatId?: string | null;
  };
  anak: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
  };
  ibadahNama: string;
};

/** Payload POST /admin/reservasi/pickup. */
export type ReservasiPickupPayload = {
  pickupCode: string; // 6-digit
  /** Optional disambiguation kalau multiple ibadah share kode 6-digit hari sama. */
  kodeReservasi?: string;
  /** Optional — scan QR parent untuk record siapa yg jemput. */
  pickedUpByJemaatId?: string;
};

/**
 * Walk-in action universal — check-in / checkout / pickup dalam 1 endpoint.
 * Per BE notice scanner-walkin-flow 2026-08-03.
 *
 * ⚠️ Endpoint accept `jemaatId` (existing). Mobile mau tambah support `kode`
 * — kirim `backend-request-walkin-accept-kode.md`. Types di sini support
 * dua-duanya (either-or) untuk future compat.
 */
export type WalkInAction = 'checkin' | 'checkout' | 'pickup';

export type WalkInReservasiPayload = {
  /** Either `jemaatId` (existing BE) atau `kode` (pending BE request). Kirim salah satu. */
  jemaatId?: string;
  /** Kode profile jemaat 8-char (pending BE support). */
  kode?: string;
  ibadahId: string;
  tanggalIbadah: string; // YYYY-MM-DD
  action: WalkInAction;
};

export type WalkInReservasiResult = {
  reservasi: {
    id: string;
    kode: string;
    status: 'JOIN' | 'COMPLETED' | 'RESERVE';
    joinedAt?: string | null;
    checkedOutAt?: string | null;
    pickedUpAt?: string | null;
    pickupCode?: string | null;
  };
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
  };
  ibadahNama: string;
  /** Convenience — sama dgn reservasi.pickupCode, kalau ada. */
  pickupCode?: string | null;
};

/**
 * Response `GET /admin/reservasi/active-today` — reservasi status JOIN hari ini
 * untuk jemaat spesifik. Dipakai untuk auto-detect ibadah aktif saat mode
 * checkout / pickup di scanner walk-in.
 */
export type ActiveTodayReservasi = {
  id: string;
  kode: string;
  ibadahId: string;
  ibadahNama: string;
  tanggalIbadah: string;
  status: 'JOIN' | 'COMPLETED';
  joinedAt: string;
  checkedOutAt?: string | null;
  pickupCode?: string | null;
  pickedUpAt?: string | null;
  isKidsIbadah?: boolean;
  requiresCheckout?: boolean;
};

/** Response data dari POST /admin/event/:id/checkin */
export type EventCheckinResult = {
  id: string;
  status: 'HADIR' | string;
  attendedAt: string;
  jemaat: CheckinJemaat;
};

/** Meta untuk check-in response */
export type CheckinMeta = {
  alreadyCheckedIn: boolean;
  walkIn?: boolean;
};

/** Stats live counts dari GET /admin/{event|ibadah}/:id/checkin/stats */
export type IbadahCheckinStats = {
  ibadahId: string;
  tanggalIbadah: string;
  total: number;
  hadir: number;
  walkIn?: number;
  lastUpdated: string;
};

export type EventCheckinStats = {
  eventId: string;
  quotaPeserta: number | null;
  total: number;
  hadir: number;
  byStatus: {
    DAFTAR?: number;
    MENUNGGU_VERIFIKASI?: number;
    BAYAR?: number;
    HADIR?: number;
    BATAL?: number;
  };
  lastUpdated: string;
};
