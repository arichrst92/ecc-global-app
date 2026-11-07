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
  /** 2.4.7 — nomor WA admin (format 08…/62…), email, username sosmed */
  waAdmin?: string | null;
  email?: string | null;
  socialUsernames?: SocialUsernames | null;
  /** 2.4.7 — hanya di detail publik: item aktif & tidak disembunyikan admin */
  items?: LocalItem[];
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
  waAdmin?: string | null;
  email?: string | null;
  socialUsernames?: SocialUsernames;
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

// ===== 2.4.7 — Katalog & kontak =====

export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', url: (u: string) => `https://instagram.com/${u}` },
  { key: 'facebook', label: 'Facebook', prefix: 'facebook.com/', url: (u: string) => `https://facebook.com/${u}` },
  { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', url: (u: string) => `https://www.tiktok.com/@${u}` },
  { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', url: (u: string) => `https://www.youtube.com/@${u}` },
  { key: 'x', label: 'X', prefix: 'x.com/', url: (u: string) => `https://x.com/${u}` },
  { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/company/', url: (u: string) => `https://www.linkedin.com/company/${u}` },
  { key: 'threads', label: 'Threads', prefix: 'threads.net/@', url: (u: string) => `https://www.threads.net/@${u}` },
] as const;
export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key'];
export type SocialUsernames = Partial<Record<SocialPlatformKey, string>>;

/** "@nama", "instagram.com/nama", "https://…/nama/" → "nama" (sama dengan server). */
export function cleanSocialUsername(v: string): string {
  return v
    .trim()
    .replace(/^https?:\/\/(www\.)?[^/]+\/(company\/|in\/)?/i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
}

/** Bisnis lama (sebelum 2.4.7) hanya punya URL sosmed — tebak username dari domainnya. */
export function usernamesFromLinks(links: SocialLink[] | null | undefined): SocialUsernames {
  const out: SocialUsernames = {};
  const host: Record<string, SocialPlatformKey> = {
    'instagram.com': 'instagram', 'facebook.com': 'facebook', 'fb.com': 'facebook', 'tiktok.com': 'tiktok',
    'youtube.com': 'youtube', 'x.com': 'x', 'twitter.com': 'x', 'linkedin.com': 'linkedin', 'threads.net': 'threads',
  };
  for (const l of links ?? []) {
    const m = /^https?:\/\/(?:www\.|m\.)?([^/]+)/i.exec(l.url);
    const key = m ? host[m[1].toLowerCase()] : undefined;
    if (!key || out[key]) continue;
    const u = cleanSocialUsername(l.url);
    if (/^[A-Za-z0-9._-]{1,60}$/.test(u)) out[key] = u;
  }
  return out;
}

export const LOCAL_CURRENCIES = ['IDR', 'AUD', 'SGD', 'MYR', 'USD', 'EUR', 'NZD', 'HKD', 'TWD', 'CNY', 'JPY'] as const;
export type LocalCurrency = (typeof LOCAL_CURRENCIES)[number];
export const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: 'Rp', AUD: 'A$', SGD: 'S$', MYR: 'RM', USD: 'US$', EUR: '€', NZD: 'NZ$', HKD: 'HK$', TWD: 'NT$', CNY: '¥', JPY: '¥',
};

export type LocalItemJenis = 'PRODUK' | 'JASA';
export type LocalHargaTipe = 'TETAP' | 'MULAI_DARI' | 'NEGO';

export type LocalItem = {
  id: string;
  businessId: string;
  jenis: LocalItemJenis;
  nama: string;
  deskripsi: string | null;
  hargaTipe: LocalHargaTipe;
  harga: number | null;
  mataUang: string;
  satuan: string | null;
  fotoUrls: string[];
  isActive: boolean;
  isHiddenByAdmin?: boolean;
  urutan: number;
  createdAt: string;
  updatedAt: string;
};

export type LocalItemPayload = {
  jenis: LocalItemJenis;
  nama: string;
  deskripsi?: string | null;
  hargaTipe: LocalHargaTipe;
  harga?: number | null;
  mataUang?: string;
  satuan?: string | null;
  isActive?: boolean;
};

/** Format angka dengan pemisah ribuan tanpa Intl (aman di Hermes lama). */
function ribuan(n: number, sep: string, dec: string): string {
  const [i, f] = (Math.round(n * 100) / 100).toString().split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return f ? `${int}${dec}${f.padEnd(2, '0')}` : int;
}

/** "Rp 150.000/porsi", "Mulai US$ 20", "Harga by agreement" */
export function hargaLabel(
  it: Pick<LocalItem, 'hargaTipe' | 'harga' | 'mataUang' | 'satuan'>,
  negoText = 'Harga by agreement',
  mulaiText = 'Mulai',
): string {
  if (it.hargaTipe === 'NEGO' || it.harga == null) return negoText;
  const idr = it.mataUang === 'IDR';
  const num = ribuan(it.harga, idr ? '.' : ',', idr ? ',' : '.');
  const sym = CURRENCY_SYMBOL[it.mataUang] ?? it.mataUang;
  return `${it.hargaTipe === 'MULAI_DARI' ? `${mulaiText} ` : ''}${sym} ${num}${it.satuan ? `/${it.satuan}` : ''}`;
}

export const LANDING_BASE = 'https://eccchurch.global';
export const itemShareUrl = (bizId: string, itemId: string) => `${LANDING_BASE}/local-market/${bizId}/item/${itemId}`;
export const waNumber = (n: string) => {
  const d = n.replace(/\D/g, '');
  return d.startsWith('0') ? `62${d.slice(1)}` : d;
};
