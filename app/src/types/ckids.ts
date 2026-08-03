/**
 * CKids Tab (Modul 28) types — per BE notice ckids-mobile-tab 2026-08-01.
 *
 * Scope mobile: parent view — point balance + katalog + QR anak + history.
 * Redeem hadiah HANYA di stall fisik via subdomain ckids.eccchurch.global
 * (admin operator), BUKAN di mobile.
 */

export type PointTxType = 'EARN' | 'SPEND' | 'ADJUST';

export type PointSource =
  | 'KEHADIRAN_KIDS' // Auto-award saat check-in kids ibadah
  | 'REDEEM' // Deduct saat redeem hadiah di stall
  | 'MANUAL_ADJUST' // Admin manual add/deduct
  | 'STOCK_ADD'; // Reserved untuk internal

/** Cabang ringkas untuk nested response. */
export type CabangRef = {
  id: string;
  nama: string;
  kode?: string;
};

/** Anak (jemaat subset) — untuk display di CKids tab. */
export type AnakRef = {
  id: string;
  namaLengkap: string;
  fotoUrl?: string | null;
  kode: string; // 8-char, dipakai untuk QR
  cabang?: CabangRef;
};

/**
 * Point balance per (anak, cabang) — dari `GET /admin/me/children-points`.
 * Kalau anak multi-cabang, return 1 row per cabang.
 */
export type ChildPointBalance = {
  anak: AnakRef;
  cabang: CabangRef;
  balance: number;
  lastUpdate: string; // ISO datetime
};

/** Katalog hadiah — dari `GET /admin/hadiah?cabangId=X`. */
export type HadiahKatalog = {
  id: string;
  nama: string;
  deskripsi?: string | null;
  fotoUrl?: string | null;
  pointCost: number;
  stock: number;
  isActive: boolean;
  cabang: CabangRef;
};

/**
 * History redeem — dari dedicated parent endpoint
 * `GET /admin/me/children-redeem-history?jemaatId=X`.
 *
 * Snapshot fields (hadiahNama, hadiahFotoUrl) supaya history tetap valid
 * kalau katalog berubah nanti.
 *
 * Per BE response 2026-08-03 di `backend-request-ckids-me-endpoints.md`.
 */
export type HadiahRedeem = {
  id: string;
  jemaatId: string;
  hadiahId: string;
  /** Snapshot nama hadiah saat redeem. */
  hadiahNama: string;
  /** Snapshot foto hadiah URL. */
  hadiahFotoUrl?: string | null;
  /** Point yg terpotong (positive number). */
  pointDeducted: number;
  /** Timestamp redeem (ISO datetime). */
  processedAt: string;
  /** Live katalog hadiah reference (bisa null kalau hadiah sudah dihapus). */
  hadiah?: {
    id: string;
    nama: string;
    fotoUrl?: string | null;
  } | null;
  cabang?: CabangRef;
  /** Admin yg proses redeem (Fulltimer di stall). */
  processedBy?: {
    id: string;
    namaLengkap: string;
  } | null;
};

/** Point transaction log — dari `GET /admin/gift-stall/transactions?jemaatId=X` (opsional). */
export type PointTransaction = {
  id: string;
  jemaatId: string;
  cabangId: string;
  type: PointTxType;
  source: PointSource;
  amount: number; // Positive untuk EARN, negative untuk SPEND
  note?: string | null;
  referenceId?: string | null; // Reservasi UUID untuk KEHADIRAN_KIDS, redeem UUID untuk REDEEM
  createdAt: string;
};

/** Group balance per anak untuk display UI (multi-cabang aggregated). */
export type ChildGroupedBalance = {
  anak: AnakRef;
  balances: Array<{
    cabang: CabangRef;
    balance: number;
    lastUpdate: string;
  }>;
  /** Total balance across semua cabang — untuk display ringkas. */
  totalBalance: number;
};
