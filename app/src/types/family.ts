// Family relation types per mobile-api-guide section 13
// Post BE refactor 2026-08-02 — dual accept role OR tipeRelasiId

/**
 * Broad enum FamilyRole — 6 values per BE (backward compat).
 * Sebelumnya mobile cuma expose 4 (SPOUSE/CHILD/PARENT/SIBLING) — extend
 * dgn GUARDIAN + OTHER supaya row lama dgn value tsb tidak type-error.
 */
export type FamilyRole =
  | 'SPOUSE'
  | 'CHILD'
  | 'PARENT'
  | 'SIBLING'
  | 'GUARDIAN'
  | 'OTHER';

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

/**
 * Tipe relasi keluarga granular — dari master data `tipe_relasi_keluarga`.
 * BE include field ini di response post-family-refactor 2026-08-02.
 * 12 tipe: Suami, Istri, Ayah, Ibu, Anak Laki-Laki, Anak Perempuan,
 * Saudara Kandung, Kakek, Nenek, Cucu, Wali, Lainnya.
 */
export type TipeRelasiKeluarga = {
  id: string;
  nama: string;
};

/** Row dari GET /admin/me/family */
export type FamilyRelation = {
  id: string;
  role: FamilyRole;
  /** Granular tipe relasi — post BE refactor 2026-08-02. Optional untuk
   *  backward compat (mobile lama tanpa field ini tetap parse OK). */
  tipeRelasi?: TipeRelasiKeluarga | null;
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

/**
 * BE post-refactor 2026-08-02 accept EITHER `role` (broad) OR `tipeRelasiId`
 * (granular UUID dari master data /admin/keluarga/tipe). Kirim salah satu,
 * bukan keduanya.
 *
 * Mobile v1.6.0+ prioritas: kirim `tipeRelasiId` untuk granular tepat.
 * Field `role` retained di type untuk backward compat consumer.
 */
type RelationDiscriminator =
  | { role: FamilyRole; tipeRelasiId?: never }
  | { role?: never; tipeRelasiId: string };

/** Payload untuk link-by-kode */
export type LinkByKodePayload = {
  kode: string;
} & RelationDiscriminator;

/** Payload untuk link-by-phone */
export type LinkByPhonePayload = {
  noHp: string;
} & RelationDiscriminator;

/** Payload untuk register-new (anak balita / lansia tanpa HP) */
export type RegisterNewFamilyPayload = {
  namaLengkap: string;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  alamat?: string | null;
  noHp?: string | null;
  cabangId?: string | null;
} & RelationDiscriminator;

/** Payload untuk PATCH update relation — support both role dan tipeRelasiId */
export type UpdateFamilyRelationPayload = RelationDiscriminator;

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
