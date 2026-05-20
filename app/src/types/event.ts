// Event types per mobile-api-guide section 5 + 15

export type TipeBayar = 'GRATIS' | 'NOMINAL_TETAP' | 'NOMINAL_BEBAS';

export type ParticipationStatus =
  | 'DAFTAR'
  | 'MENUNGGU_VERIFIKASI'
  | 'BAYAR'
  | 'HADIR'
  | 'BATAL';

type SinodeRef = { id: string; nama: string };
type CabangRef = { id: string; nama: string };

/** Item dari GET /admin/event (list, paginated) */
export type EventListItem = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string;
  heroImageUrl?: string | null;
  videoUrl?: string | null;
  tanggalMulai: string; // ISO datetime
  tanggalSelesai: string;
  lokasi: string;
  tipeBayar: TipeBayar;
  nominal: string; // Decimal string untuk presisi
  quotaPeserta: number | null;
  butuhKehadiran: boolean;
  isPublished: boolean;
  publishedAt: string;
  sinode?: SinodeRef | null;
  cabang?: CabangRef | null;
  pesertaCount: number;
};

/** Detail dari GET /admin/event/:idOrSlug. Per BE patch 2026-05-21i:
 * `myParticipation` field included (null kalau user belum daftar). Source of
 * truth untuk participation status — local store dipakai untuk offline cache. */
export type EventDetail = EventListItem & {
  deskripsi: string; // markdown
  qrisImageUrl?: string | null;
  bankNama?: string | null;
  bankNomor?: string | null;
  bankAtasNama?: string | null;
  tags?: string[];
  author?: { id: string; jemaat: { id: string; namaLengkap: string } };
  myParticipation?: EventParticipation | null;
};

/** Participation/Peserta row */
export type EventParticipation = {
  id: string;
  eventId: string;
  jemaatId: string;
  status: ParticipationStatus;
  nominalBayar: string;
  catatan?: string | null;
  buktiTransferUrl?: string | null;
  registeredAt: string;
  paidAt?: string | null;
  attendedAt?: string | null;
  jemaat?: { id: string; namaLengkap: string; fotoUrl?: string | null };
};

/** Response dari POST /admin/event/:id/peserta/batch */
export type BatchRegisterResponse = {
  successful: EventParticipation[];
  failed: Array<{
    jemaatId: string;
    error: { code: string; message: string };
  }>;
};
