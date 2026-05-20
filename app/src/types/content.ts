// News & Renungan types per mobile-api-guide section 7

export type ContentTipe = 'NEWS' | 'RENUNGAN';

type SinodeRef = { id: string; nama: string };
type CabangRef = { id: string; nama: string };

export type NewsItem = {
  id: string;
  tipe: 'NEWS';
  judul: string;
  slug: string;
  ringkasan: string;
  konten: string; // markdown
  heroImageUrl?: string | null;
  tags?: string[];
  isPublished: boolean;
  publishedAt: string; // ISO datetime
  viewCount?: number;
  sinode?: SinodeRef | null;
  cabang?: CabangRef | null;
  author?: {
    jemaat: { namaLengkap: string; fotoUrl?: string | null };
  };
};

export type RenunganItem = {
  id: string;
  tipe: 'RENUNGAN';
  judul: string;
  slug: string;
  ringkasan: string;
  konten: string;
  heroImageUrl?: string | null;
  tags?: string[];
  isPublished: boolean;
  publishedAt: string;
  /** Khusus renungan: tanggal renungan ditujukan */
  tanggal: string;
  /** Khusus renungan: ayat acuan */
  ayatAlkitab: string;
  sinode?: SinodeRef | null;
  cabang?: CabangRef | null;
};
