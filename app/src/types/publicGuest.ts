/**
 * Public guest-browse types — slim variant dari /admin/* types.
 * Per BE response docs/backend-request-public-endpoints-for-guest.md (2026-05-24).
 *
 * Field yang di-omit (vs /admin variant) untuk privacy:
 * - Ibadah: tidak ada petugas, attendees count, internal notes
 * - Event: tidak ada peserta list, internal capacity
 * - LocalBusiness: owner cuma namaLengkap + cabang (no contact info)
 * - Rekening: full info (publik di buletin cabang)
 */

import type { TipeBayar } from './event';

export type PublicIbadahItem = {
  id: string;
  tanggal: string; // "2026-05-25"
  jam: string; // "08:00"
  jamSelesai: string | null;
  judul: string;
  /** Nullable — ibadah bisa multi-cabang atau synod-level (no specific cabang). */
  cabang: { id: string; nama: string } | null;
  kategori: { id: string; nama: string } | null;
  lokasi: string | null;
  isOnline: boolean;
  /** URL akses online (Zoom/YouTube Live/Meet). Mirror semantic dengan
   *  IbadahListItem.linkOnline. BE field name belum konfirmasi — pakai
   *  getOnlineLink() helper untuk multi-field fallback. */
  linkOnline?: string | null;
};

export type PublicIbadahResponse = {
  data: PublicIbadahItem[];
  meta: { from: string; to: string; count: number };
};

export type PublicEventItem = {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string | null;
  heroImageUrl: string | null;
  tanggalMulai: string; // ISO datetime
  tanggalSelesai: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  lokasi: string | null;
  tipeBayar: TipeBayar;
  nominal: string | null;
  /** Nullable — event bisa synod-level (multi-cabang). */
  cabang: { id: string; nama: string } | null;
};

export type PublicEventResponse = {
  data: PublicEventItem[];
  meta: { page: number; limit: number; total: number };
};

/** Detail event public — superset of list item + deskripsi/videoUrl/payment info.
 *  Per BE handoff 2026-05-24 /public/event/:slug. */
export type PublicEventDetail = PublicEventItem & {
  deskripsi: string; // markdown
  videoUrl: string | null;
  qrisImageUrl: string | null;
  bankNama: string | null;
  bankNomor: string | null;
  bankAtasNama: string | null;
  tags: string[];
  viewCount: number;
};

export type PublicLocalBusiness = {
  id: string;
  nama: string;
  deskripsi: string | null;
  industri: string;
  tipeBisnis: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  companyProfileUrl: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
  websiteUrl: string | null;
  whatsappUrl: string | null;
  isOnline: boolean;
  lokasi: string | null;
  owner: {
    namaLengkap: string;
    cabang: { id: string; nama: string };
  };
};

export type PublicLocalMarketResponse = {
  data: PublicLocalBusiness[];
  meta: { page: number; limit: number; total: number };
};

export type PublicRekening = {
  id: string;
  purpose: string;
  bankNama: string;
  bankNomor: string;
  bankAtasNama: string;
  qrisImageUrl: string | null;
  catatan: string | null;
};

/** Response /public/cabang/:id/rekening wrap data dengan cabang + rekening list. */
export type PublicRekeningResponse = {
  cabang: { id: string; nama: string; kode: string };
  rekening: PublicRekening[];
};

// ============ News + Renungan (BE handoff 2026-05-24) ============

export type PublicNewsItem = {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string | null;
  heroImageUrl: string | null;
  tanggal: string; // ISO datetime
  tags: string[];
  cabang: { id: string; nama: string } | null;
  author: { namaLengkap: string } | null;
};

export type PublicNewsResponse = {
  data: PublicNewsItem[];
  meta: { page: number; limit: number; total: number };
};

export type PublicNewsDetail = PublicNewsItem & {
  konten: string; // markdown body
  viewCount: number;
};

export type PublicRenunganItem = {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string | null;
  ayatAlkitab: string | null;
  tanggal: string;
  author: { namaLengkap: string } | null;
};

export type PublicRenunganResponse = {
  data: PublicRenunganItem[];
  meta: { page: number; limit: number; total: number };
};

export type PublicRenunganDetail = PublicRenunganItem & {
  konten: string; // markdown body
  viewCount: number;
};
