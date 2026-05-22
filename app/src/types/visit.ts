// Visit (Movement) types per BE handoff doc 2026-05-22.
// Endpoint: /admin/me/visits/* — semua dari perspektif caller.

type CabangRef = { id: string; nama: string };

/** Lawan jemaat — siapapun yang bukan caller (initiator atau target) */
export type VisitLawan = {
  id: string;
  namaLengkap: string;
  fotoUrl?: string | null;
  noHp?: string | null;
  cabang: CabangRef;
};

/** Item dari GET /admin/me/visits — sudah di-shape dari perspektif caller */
export type VisitListItem = {
  id: string;
  judul: string;
  lokasi: string | null;
  tanggalVisit: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
  /** true = caller adalah initiator (yang scan), false = caller adalah target */
  iAmInitiator: boolean;
  lawan: VisitLawan;
  /** Note yang ditulis caller — visible ke kedua belah pihak */
  myNote: string | null;
  /** Note yang ditulis lawan — read-only untuk caller */
  noteLawan: string | null;
};

/** Detail dari GET /admin/me/visits/:id — same shape as list item */
export type VisitDetail = VisitListItem;

/** Payload POST /admin/me/visits (create via QR scan) */
export type CreateVisitPayload = {
  /** 8-char QR kode jemaat */
  targetKode: string;
  /** Judul visit, 2-255 chars */
  judul: string;
  /** Lokasi text bebas, max 500 chars, opsional */
  lokasi?: string;
};

/** Payload PATCH /admin/me/visits/:id (initiator-only) */
export type UpdateVisitMetaPayload = {
  judul?: string;
  lokasi?: string | null;
};

/** Payload PATCH /admin/me/visits/:id/note (kedua belah pihak) */
export type UpdateVisitNotePayload = {
  /** Empty string = hapus note. Max 2000 chars. */
  note: string;
};

/** Query params untuk GET /admin/me/visits */
export type VisitListQuery = {
  role?: 'all' | 'initiator' | 'target';
  from?: string; // YYYY-MM-DD
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
};

/** Paginated meta dari list endpoint */
export type VisitListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type VisitListResponse = {
  data: VisitListItem[];
  meta: VisitListMeta;
};
