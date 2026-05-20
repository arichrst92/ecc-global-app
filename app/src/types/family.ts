// Family relation types per mobile-api-guide section 13

export type FamilyRole = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING';

type CabangRef = { id: string; nama: string };

/** Jemaat dalam konteks family member — subset Jemaat dengan flag isDependent */
export type FamilyMemberJemaat = {
  id: string;
  namaLengkap: string;
  noHp: string | null;
  kode: string;
  fotoUrl?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  cabang: CabangRef;
  /** true = jemaat tidak punya noHp dan current user adalah primaryGuardian */
  isDependent: boolean;
};

/** Row dari GET /admin/me/family */
export type FamilyRelation = {
  id: string;
  role: FamilyRole;
  isVerified: boolean;
  createdAt: string;
  jemaat: FamilyMemberJemaat;
};

/** Response dari link-by-kode / link-by-phone — shape berbeda dari list row.
 * Per mobile-api-guide section 13.3 — return relation summary + target jemaat info. */
export type LinkFamilyResponse = {
  id: string;
  jemaatAId: string;
  jemaatBId: string;
  role: FamilyRole;
  isVerified: boolean;
  target: {
    id: string;
    namaLengkap: string;
    kode: string;
  };
};

/** Payload untuk link-by-kode */
export type LinkByKodePayload = {
  kode: string;
  role: FamilyRole;
};

/** Payload untuk link-by-phone */
export type LinkByPhonePayload = {
  noHp: string;
  role: FamilyRole;
};

/** Payload untuk register-new (anak balita / lansia tanpa HP) */
export type RegisterNewFamilyPayload = {
  namaLengkap: string;
  role: FamilyRole;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  alamat?: string | null;
  noHp?: string | null;
  cabangId?: string | null;
};

/** Response dari register-new */
export type RegisterNewFamilyResponse = {
  jemaat: {
    id: string;
    namaLengkap: string;
    kode: string;
    noHp: string | null;
  };
  family: {
    id: string;
    role: FamilyRole;
    isVerified: boolean;
  };
};
