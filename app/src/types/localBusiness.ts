// Local Market (Movement) types per BE handoff doc 2026-05-22 (rev a).
// Owner CRUD di /admin/me/businesses/*, public browse di /admin/me/local-market/*

export type TipeBisnis = 'B2C' | 'B2B' | 'B2B2C';

export type SocialLink = {
  platform: string; // free text 1-50 chars, mis. "Instagram", "TikTok"
  url: string;
};

/** Owner ref di response */
export type BusinessOwner = {
  id: string; // jemaatId
  namaLengkap: string;
  fotoUrl?: string | null;
  cabang?: { id: string; nama: string } | null;
};

/** LocalBusiness — shape sama untuk owner CRUD & public browse */
export type LocalBusiness = {
  id: string;
  ownerJemaatId: string;
  nama: string;
  deskripsi: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  industri: string | null;
  tipeBisnis: TipeBisnis;
  isOnline: boolean;
  lokasi: string | null;
  websiteUrl: string | null;
  whatsappUrl: string | null;
  companyProfileUrl: string | null;
  socialLinks: SocialLink[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: BusinessOwner;
};

/** Payload create */
export type CreateBusinessPayload = {
  nama: string;
  deskripsi?: string;
  industri?: string;
  tipeBisnis: TipeBisnis;
  isOnline?: boolean;
  lokasi?: string;
  websiteUrl?: string;
  whatsappUrl?: string;
  socialLinks?: SocialLink[];
};

/** Payload update — semua opsional, kirim hanya field yang berubah.
 * `socialLinks` REPLACE entire array (no merge). */
export type UpdateBusinessPayload = Partial<CreateBusinessPayload> & {
  isActive?: boolean;
};

/** Query params untuk public browse */
export type LocalMarketQuery = {
  cabangId?: string;
  industri?: string;
  tipeBisnis?: TipeBisnis;
  isOnline?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'nama' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export type LocalMarketListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LocalMarketListResponse = {
  data: LocalBusiness[];
  meta: LocalMarketListMeta;
};

/** Preset industri suggestions — UX hint, user tetap bebas ketik */
export const INDUSTRI_SUGGESTIONS = [
  'Kuliner',
  'F&B',
  'Fashion',
  'Tech / IT',
  'Konsultan',
  'Jasa',
  'Retail',
  'Edukasi',
  'Kesehatan',
  'Properti',
  'Logistik',
  'Otomotif',
  'Kreatif',
];
