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
  status: 'JOIN' | 'BATAL';
  kode: string;
  joinedAt: string;
  jemaat: CheckinJemaat;
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
