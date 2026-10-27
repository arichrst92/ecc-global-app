// Homecell types per mobile-api-guide section 12.6 (incl. BE patch 21p)

type CabangRef = { id: string; nama: string };
type AreaRef = { id: string; nama: string; cabang: CabangRef };
type AreaRefWithPic = AreaRef & { picJemaatId?: string | null };

/** Item dari GET /admin/me/homecell-managed */
export type PicHomecell = {
  id: string;
  nama: string;
  alamat: string | null;
  hari: string | null;
  jam: string | null;
  area: AreaRef;
  memberCount: number;
  kategori?: 'SINGLE' | 'COUPLE' | null;
  usiaMin?: number | null;
  usiaMax?: number | null;
};

/** Item dari GET /admin/me/homecell-area-managed */
export type PicArea = {
  id: string;
  nama: string;
  cabang: CabangRef;
  homecellCount: number;
};

/** Member row di homecell (returned dari add by-kode + di list members) */
export type HomecellMember = {
  id: string;
  homecellId?: string;
  jemaatId: string;
  isActive: boolean;
  tanggalBergabung: string;
  tanggalKeluar?: string | null;
  jemaat: {
    id?: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
    noHp?: string | null;
    jenisKelamin?: 'L' | 'P' | null;
    /** Usia (tahun) — hanya untuk pemimpin; null bila tanggal lahir kosong/privat. */
    usia?: number | null;
  };
  /** Tanggal pertemuan terakhir yang dihadiri di homecell ini (YYYY-MM-DD). */
  lastAttendedAt?: string | null;
  lastAttendedDaysAgo?: number | null;
};

/** Response GET /admin/homecell/:id — detail + nested members.
 * Per BE patch 2026-05-21p (extended existing endpoint). */
export type HomecellDetail = {
  id: string;
  nama: string;
  alamat: string | null;
  hari: string | null;
  jam: string | null;
  isActive: boolean;
  picJemaatId?: string | null;
  kategori?: 'SINGLE' | 'COUPLE' | null;
  usiaMin?: number | null;
  usiaMax?: number | null;
  area: AreaRefWithPic;
  members: HomecellMember[];
};

/** Item dari GET /admin/homecell-area/:id/homecells (BE patch 21p).
 * Shape ringkas dengan picJemaat info untuk display PIC name per homecell. */
export type AreaHomecellRow = {
  id: string;
  nama: string;
  alamat: string | null;
  hari: string | null;
  jam: string | null;
  isActive: boolean;
  picJemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
  } | null;
  memberCount: number;
  kategori?: 'SINGLE' | 'COUPLE' | null;
  usiaMin?: number | null;
  usiaMax?: number | null;
  /** Rata² % kehadiran (0–100); null bila belum ada pertemuan/anggota. */
  avgAttendancePercent?: number | null;
};

// ============================================================
//  Homecell untuk semua jemaat — /admin/me/homecell/*
//  (lihat docs/be-update-2026-10-13-homecell-join.md)
// ============================================================

export type HomecellMyStatus = 'MEMBER' | 'PENDING' | 'LEADER' | null;

/** Item list (browse / nearest / overview). */
export type HomecellListItem = {
  id: string;
  nama: string;
  deskripsi: string | null;
  alamat: string | null;
  hari: string | null;
  jam: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  /** Segmen homecell — null = umum. */
  kategori?: 'SINGLE' | 'COUPLE' | null;
  usiaMin?: number | null;
  usiaMax?: number | null;
  hasLocation: boolean;
  area: AreaRef;
  picJemaat: { id: string; namaLengkap: string; fotoUrl: string | null } | null;
  memberCount: number;
  /** Jarak dari posisi user (km, 1 desimal) — null kalau lokasi tidak dikirim / homecell belum punya lokasi. */
  distanceKm: number | null;
  myStatus: HomecellMyStatus;
  /** Pertemuan terakhir (jadwal ≤ hari ini dengan ≥1 hadir), YYYY-MM-DD. */
  lastMeetingAt?: string | null;
  lastMeetingDaysAgo?: number | null;
};

/** Pertemuan berikutnya (overview). */
export type HomecellNextSchedule = { id: string; tanggal: string; jamMulai?: string | null; jamSelesai?: string | null; lokasi: string; catatan: string | null } | null;

export type HomecellOverview = {
  role: 'LEADER' | 'MEMBER' | 'NONE';
  cabang: CabangRef | null;
  managed: (HomecellListItem & { pendingJoinCount: number; nextSchedule?: HomecellNextSchedule })[];
  memberships: { tanggalBergabung: string; homecell: HomecellListItem & { nextSchedule?: HomecellNextSchedule } }[];
  pendingRequests: { id: string; createdAt: string; pesan: string | null; homecell: { id: string; nama: string } }[];
};

/** Detail read-only — GET /admin/me/homecell/:id */
export type HomecellPublicDetail = Omit<HomecellListItem, 'picJemaat'> & {
  picJemaat: { id: string; namaLengkap: string; fotoUrl: string | null; noHp: string | null } | null;
  upcomingSchedules: { id: string; tanggal: string; jamMulai?: string | null; jamSelesai?: string | null; lokasi: string; catatan: string | null }[];
  /** Hanya terisi kalau user anggota / leader homecell ini. */
  members: {
    id: string;
    namaLengkap: string;
    fotoUrl: string | null;
    lastAttendedAt?: string | null;
    lastAttendedDaysAgo?: number | null;
  }[];
  myPendingRequest: { id: string; createdAt: string } | null;
};

export type HomecellNearestResponse = {
  items: HomecellListItem[];
  totalInCabang: number;
  withoutLocation: number;
};

/** Permintaan bergabung (untuk leader). */
export type HomecellJoinRequestRow = {
  id: string;
  createdAt: string;
  pesan: string | null;
  homecell: { id: string; nama: string };
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    fotoUrl: string | null;
    noHp: string | null;
    jenisKelamin: 'L' | 'P' | null;
    tanggalLahir: string | null;
    alamat: string | null;
  };
};
