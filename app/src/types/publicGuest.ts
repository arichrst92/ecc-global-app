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
  cabang: { id: string; nama: string };
  kategori: { id: string; nama: string } | null;
  lokasi: string | null;
  isOnline: boolean;
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
  cabang: { id: string; nama: string };
};

export type PublicEventResponse = {
  data: PublicEventItem[];
  meta: { page: number; limit: number; total: number };
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
