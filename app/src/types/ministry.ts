// Ministry types per BE patch 2026-05-22a (mobile-api-guide section 16)
// BE schema: Pelayanan (master, global) + PelayananRole (per-pelayanan roles) +
// JemaatPelayanan (membership). "Ministry" di mobile = "Pelayanan" di BE.

export type MinistryRole = {
  id: string;
  nama: string;
  /** Integer level — higher = more senior. Leader = level tertinggi. */
  level: number;
};

export type MinistryLeader = {
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
    noHp?: string | null;
  };
  role: MinistryRole;
};

/** Item dari GET /admin/ministry (list) */
export type MinistryListItem = {
  id: string;
  nama: string;
  deskripsi: string | null;
  memberCount: number;
  isOpen: boolean; // saat ini = isActive flag
  leader: MinistryLeader | null;
  roles: MinistryRole[];
};

/** Member row di detail page */
export type MinistryMember = {
  id: string;
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
    /** Optional — BE mungkin sertakan untuk close-relation, untuk WA action.
     * Kalau null, WA button di-hide. */
    noHp?: string | null;
    cabang?: { id: string; nama: string } | null;
  };
  posisi: string | null;
  /** Integer level dari PelayananRole — lebih tinggi = lebih senior */
  posisiLevel?: number | null;
  sinceDate: string; // ISO
};

/** Detail dari GET /admin/ministry/:id */
export type MinistryDetail = {
  id: string;
  nama: string;
  deskripsi: string | null;
  isOpen: boolean;
  memberCount: number;
  roles: MinistryRole[];
  leader: MinistryLeader | null;
  members: MinistryMember[];
  /** Populated kalau current user adalah member */
  myMembership: {
    id: string;
    posisi: string | null;
    sinceDate: string;
  } | null;
};
