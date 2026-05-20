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
