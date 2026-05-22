// Jemaat public profile per BE patch 2026-05-22a (mobile-api-guide section 17)
// Endpoint: GET /admin/jemaat-public/:id (BUKAN /admin/jemaat/:id yang admin CRUD)

export type JemaatVisibilityReason =
  | 'same-cabang'
  | 'family'
  | 'homecell-co-member'
  | 'public-only';

export type JemaatPublicMinistry = {
  id: string;
  pelayananId: string;
  nama: string;
  posisi?: string | null;
  posisiLevel?: number | null;
};

export type JemaatPublicRole = {
  role: { id: string; nama: string };
  subRole?: { id: string; nama: string } | null;
  subRoleStatus?: { id: string; nama: string } | null;
};

export type JemaatPublicFamily = {
  role: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING';
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
  };
};

/**
 * Response GET /admin/jemaat-public/:id.
 * Tiered visibility — close-relation fields nullable kalau requester bukan
 * close relation dari target jemaat.
 */
export type JemaatPublicProfile = {
  // Always populated (public tier)
  id: string;
  kode: string;
  namaLengkap: string;
  fotoUrl?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  isActive: boolean;
  cabang: { id: string; nama: string };
  roles: JemaatPublicRole[];
  ministries: JemaatPublicMinistry[];
  homecell: { id: string; nama: string } | null;
  /** Masked format "+628****8446" — selalu tersedia. */
  noHpMasked: string | null;
  /** Format "MM-DD" — selalu tersedia (privacy: no tahun). */
  ulangTahunBulanTgl: string | null;

  // Close-relation tier — nullable kalau bukan close relation
  /** Full E.164 nomor HP — null kalau bukan close relation. Pakai untuk WA. */
  noHp: string | null;
  /** Full ISO date — null kalau bukan close relation. */
  tanggalLahir: string | null;
  alamat: string | null;
  family: JemaatPublicFamily[] | null;

  /** Helper untuk UI — explain kenapa tier-2 fields populated/null */
  visibility: {
    isCloseRelation: boolean;
    reason: JemaatVisibilityReason;
  };
};
