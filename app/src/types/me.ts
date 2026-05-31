// /admin/me/* types per mobile-api-guide section 12.2 + 12.3

export type MeStats = {
  streakWeeks: number;
  attendedThisYear: number;
  eventsJoined: number;
  homecellsActive: number;
  totalAttended: number;
};

export type MeProfile = {
  id: string;
  namaLengkap: string;
  kode: string;
  noHp: string;
  email?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  alamat?: string | null;
  fotoUrl?: string | null;
  cabang: { id: string; nama: string; kode: string };
  jemaatRoles?: Array<{
    role: { nama: string };
    subRole?: { nama: string } | null;
    subRoleStatus?: { nama: string } | null;
  }>;
  /**
   * Ministry / pelayanan yang user-nya terlibat aktif.
   * Per BE patch 2026-05-22a — flatten dari JemaatPelayanan aktif.
   * Selalu di-return (empty array kalau user tidak terlibat ministry).
   */
  ministries?: Array<{
    /** JemaatPelayanan id (membership row id) */
    id: string;
    /** Pelayanan master id — pakai ini untuk navigate ke /ministry/:id */
    pelayananId: string;
    nama: string;
    deskripsi?: string | null;
    posisi?: string | null;
    posisiLevel?: number | null;
    tanggalMulai?: string | null;
  }>;
  homecellMembership?: Array<{
    homecell: {
      id: string;
      nama: string;
      area: { id: string; nama: string };
    };
  }>;
  user?: { id: string; fotoUrl?: string | null };
};
