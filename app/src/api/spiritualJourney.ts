/** Spiritual Journey saya — GET /admin/me/spiritual-journey */
import { api } from './client';

export type JourneyEvent = {
  id: string;
  judul: string;
  tanggalMulai: string;
  jamMulai: string | null;
  lokasi: string | null;
  cabang: { id: string; nama: string } | null;
};

export type JourneyStep = {
  id: string;
  urutan: number;
  judul: string;
  deskripsi: string | null;
  caraMendapatkan: string | null;
  ikon: string | null;
  syarat: { role: string; subRole: string | null; status: string | null };
  achieved: boolean;
  isNext: boolean;
  events: JourneyEvent[];
};

/** Request update tahap (2.4.6) — disetujui admin di Portal. */
export type JourneyRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  catatan: string | null;
  alasanTolak: string | null;
  createdAt: string;
  reviewedAt: string | null;
  step: { id: string; judul: string };
};

export type MyJourney = {
  total: number;
  achievedCount: number;
  nextIndex: number | null;
  /** Request terakhir (server ≥ 2.4.6); undefined di server lama. */
  request?: JourneyRequest | null;
  steps: JourneyStep[];
};

export const getMyJourney = () => api.get<MyJourney>('/admin/me/spiritual-journey');

/** POST /admin/me/spiritual-journey/request (2.4.6) */
export const requestJourneyUpdate = (body: { stepId: string; catatan: string }) =>
  api.post<JourneyRequest>('/admin/me/spiritual-journey/request', body);

/** DELETE /admin/me/spiritual-journey/request/:id (2.4.6) — batalkan yang masih menunggu. */
export const cancelJourneyRequest = (id: string) =>
  api.delete<{ id: string; status: 'CANCELLED' }>(`/admin/me/spiritual-journey/request/${id}`);
