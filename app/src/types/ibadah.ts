// Ibadah & calendar types per mobile-api-guide section 4

export type TipeJadwal = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ONCE';

export type KategoriIbadah = {
  id: string;
  nama: string;
};

export type CabangRef = {
  id: string;
  nama: string;
};

/** Item dari GET /admin/ibadah (list, paginated) */
export type IbadahListItem = {
  id: string;
  nama: string;
  tipeJadwal: TipeJadwal;
  hari?: string | null;
  tanggalMulai: string; // ISO date
  jamMulai: string; // HH:mm
  jamSelesai: string;
  lokasi: string;
  isOnline: boolean;
  /** URL akses ibadah online (Zoom / YouTube Live / Google Meet, dll).
   *  Kalau isOnline=true + linkOnline ada → tampil tombol "Akses Online"
   *  di mobile (detail + dashboard card). Null kalau ibadah offline only
   *  atau BE belum sediakan link. Per BE 2026-05-24: field di-rename
   *  dari `linkStream` → `linkOnline`, exposed di list + calendar +
   *  detail + public/calendar. */
  linkOnline?: string | null;
  isActive: boolean;
  /** Toggle per ibadah — kalau true, wajib checkout via scan admin saat
   *  jemaat keluar. Default false. Per BE notice Modul 26 2026-08-01
   *  (backend-notice-checkout-ibadah.md). */
  requiresCheckout?: boolean;
  /** Flag ibadah anak — trigger pickup code (6-digit) + point earn.
   *  Default false. Per BE notice Modul 27 2026-08-01
   *  (backend-notice-kids-ibadah-pickup.md). */
  isKidsIbadah?: boolean;
  cabang: CabangRef;
  kategoriIbadah?: KategoriIbadah | null;
  pelayananCount?: number;
  petugasCount?: number;
};

/** Occurrence dari GET /admin/ibadah/calendar — satu instance ibadah pada tanggal tertentu */
export type IbadahOccurrence = {
  ibadahId: string;
  tanggal: string; // YYYY-MM-DD
  nama: string;
  jamMulai: string;
  jamSelesai: string;
  tipeJadwal: TipeJadwal;
  lokasi: string;
  isOnline: boolean;
  /** URL akses online — sama semantic dengan IbadahListItem.linkOnline. */
  linkOnline?: string | null;
  cabang: CabangRef;
  kategoriIbadah?: KategoriIbadah | null;
};

/** Detail dari GET /admin/ibadah/:id — punya petugas + pelayanan */
export type IbadahDetail = IbadahListItem & {
  // BE return additional fields: deskripsi, petugas list, dll
  deskripsi?: string | null;
  petugas?: IbadahPetugas[];
};

export type IbadahPetugas = {
  id: string;
  pelayananNama: string; // mis. "Worship", "Multimedia"
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
  };
  role: string; // "Leader", "Member"
};

/**
 * Reservasi (existing) + extended fields dari Modul 26 (checkout) + Modul 27
 * (kids pickup). Ini shape untuk consumer mobile — detail schema BE di
 * backend-notice-checkout-ibadah.md + backend-notice-kids-ibadah-pickup.md.
 */
export type ReservasiStatus = 'RESERVE' | 'JOIN' | 'COMPLETED' | 'CANCEL';

export type Reservasi = {
  id: string;
  kode: string; // 7-char alphanumeric
  ibadahId: string;
  jemaatId: string;
  tanggalIbadah: string;
  status: ReservasiStatus;
  joinedAt?: string | null;
  /** Timestamp saat admin scan QR checkout. NULL = belum checkout.
   *  Per BE notice Modul 26 2026-08-01. */
  checkedOutAt?: string | null;
  /** Admin (jemaat UUID) yg scan checkout. */
  checkedOutBy?: string | null;
  /** 6-digit numeric, auto-gen saat check-in kalau ibadah.isKidsIbadah=true.
   *  NULL untuk ibadah non-kids. Unique per (ibadah, tanggal).
   *  Per BE notice Modul 27 2026-08-01. */
  pickupCode?: string | null;
  /** Timestamp saat admin verify pickup code. NULL = anak belum di-pickup. */
  pickedUpAt?: string | null;
  /** Parent/wali (jemaat UUID) yg jemput. Optional (kalau admin scan QR parent). */
  pickedUpByJemaatId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Response `GET /admin/me/reservasi` — parent-scoped reservasi (self + anak).
 * Include nested jemaat (bisa anak) + ibadah summary.
 * Per BE response 2026-08-03 di `backend-request-me-reservasi-pickup-code.md`.
 */
export type MyReservasi = {
  id: string;
  kode: string;
  tanggalIbadah: string;
  status: ReservasiStatus;
  joinedAt?: string | null;
  checkedOutAt?: string | null;
  /** Admin yg check-in — kalau `= self`, berarti parent yg drop off anak. */
  checkedInBy?: string | null;
  pickupCode?: string | null;
  pickedUpAt?: string | null;
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
  };
  ibadah: {
    id: string;
    nama: string;
    jamMulai: string;
    jamSelesai: string;
    isKidsIbadah?: boolean;
    requiresCheckout?: boolean;
  };
};

/** Query params untuk `GET /admin/me/reservasi`. */
export type ListMyReservasiParams = {
  ibadahId?: string;
  tanggal?: string;
  status?: 'RESERVE' | 'JOIN' | 'CANCEL';
  activeOnly?: boolean;
};
