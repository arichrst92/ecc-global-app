/**
 * Homecell untuk MODE TAMU (tanpa akun) — /public/homecell/*.
 * Alamat, link Maps & kontak pemimpin baru dikirim server setelah
 * permintaan diterima (lihat guestRequestStatus).
 */
import { api } from './client';
import type { HomecellListItem, HomecellNearestResponse } from '@/types/homecell';

export type PublicHomecellItem = {
  id: string;
  nama: string;
  deskripsi: string | null;
  hari: string | null;
  jam: string | null;
  kategori: 'SINGLE' | 'COUPLE' | null;
  usiaMin: number | null;
  usiaMax: number | null;
  hasLocation: boolean;
  area: { id: string; nama: string; cabang: { id: string; nama: string } };
  memberCount: number;
  distanceKm: number | null;
  lastMeetingAt?: string | null;
  lastMeetingDaysAgo?: number | null;
};

export type GuestRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type GuestRequest = {
  id: string;
  status: GuestRequestStatus;
  nama: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
  homecell: {
    id: string;
    nama: string;
    hari: string | null;
    jam: string | null;
    area: string;
    cabang: string;
    /** Hanya setelah DITERIMA. */
    alamat?: string | null;
    mapsUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    pic?: { nama: string; noHp: string | null } | null;
  };
};

export type GuestRequestInput = {
  nama: string;
  noHp: string;
  jenisKelamin?: 'L' | 'P';
  usia?: number;
  pesan?: string;
};

/** Bentuk kartu homecell yang sama dengan anggota (komponen dipakai ulang). */
export function toListItem(h: PublicHomecellItem, pending: boolean): HomecellListItem {
  return {
    ...h,
    alamat: null,
    latitude: null,
    longitude: null,
    mapsUrl: null,
    picJemaat: null,
    myStatus: pending ? 'PENDING' : null,
  } as HomecellListItem;
}

const qs = (o: Record<string, string | number | null | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export function browsePublicHomecells(p: { cabangId: string; q?: string; lat?: number; lng?: number; kategori?: 'SINGLE' | 'COUPLE' | null }) {
  return api.get<PublicHomecellItem[]>(`/public/homecell/browse?${qs({ ...p })}`, { skipAuth: true });
}

export function nearestPublicHomecells(p: { cabangId: string; lat: number; lng: number; limit?: number }) {
  return api.get<Omit<HomecellNearestResponse, 'items'> & { items: PublicHomecellItem[] }>(
    `/public/homecell/nearest?${qs({ ...p, limit: p.limit ?? 3 })}`,
    { skipAuth: true },
  );
}

export function createGuestRequest(homecellId: string, body: GuestRequestInput) {
  return api.post<{ token: string; request: GuestRequest }>(`/public/homecell/${homecellId}/guest-request`, body, {
    skipAuth: true,
  });
}

export function guestRequestStatus(tokens: string[]) {
  return api.post<{ token: string; request: GuestRequest | null }[]>('/public/homecell/guest-request/status', { tokens }, {
    skipAuth: true,
  });
}

export function cancelGuestRequest(token: string) {
  return api.post<{ cancelled: true }>('/public/homecell/guest-request/cancel', { token }, { skipAuth: true });
}
