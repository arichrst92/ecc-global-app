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
  };
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
};
