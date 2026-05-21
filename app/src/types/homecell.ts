// Homecell types per mobile-api-guide section 12.6

type CabangRef = { id: string; nama: string };
type AreaRef = { id: string; nama: string; cabang: CabangRef };

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

/** Member row di homecell (returned dari add by-kode) */
export type HomecellMember = {
  id: string;
  homecellId: string;
  jemaatId: string;
  isActive: boolean;
  tanggalBergabung: string;
  jemaat: {
    id?: string;
    namaLengkap: string;
    kode: string;
    fotoUrl?: string | null;
    noHp?: string | null;
  };
};
