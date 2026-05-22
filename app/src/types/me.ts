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
   * Pending BE field — lihat docs/backend-request-ministry-endpoints.md.
   * Sementara akan undefined sampai BE add field ini ke /admin/me response.
   */
  ministries?: Array<{
    id: string;
    nama: string;
    posisi?: string | null;
    /** Cabang tempat ministry berada — bisa lain dari user.cabang */
    cabang?: { id: string; nama: string } | null;
  }>;
  homecellMembership?: Array<{
    homecell: {
      id: string;
      nama: string;
      area: { id: string; nama: string };
    };
  }>;
  user?: { id: string; fotoUrl?: string | null; faceEnrolledAt?: string | null };
};
