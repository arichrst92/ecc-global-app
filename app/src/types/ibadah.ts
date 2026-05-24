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
