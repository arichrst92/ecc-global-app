/** Konseling (2.5.1) — /admin/me/konseling */
import { api } from './client';

export type KonselingStatus = 'BARU' | 'DITUGASKAN' | 'DIJADWALKAN' | 'SELESAI' | 'DIBATALKAN';
export type GenderPref = 'ANY' | 'SAME';

export type Konseling = {
  id: string;
  pokokMasalah: string;
  harapan: string;
  jadwalUsulan: string | null;
  catatanJadwal: string | null;
  preferensiGender: GenderPref;
  kontakNoHp: string | null;
  kontakEmail: string | null;
  status: KonselingStatus;
  konselor: { id: string; namaLengkap: string; fotoUrl: string | null } | null;
  assignedAt: string | null;
  jadwalFinal: string | null;
  catatanKonselor: string | null;
  selesaiAt: string | null;
  dibatalkanAt: string | null;
  dibatalkanOleh: string | null;
  alasanBatal: string | null;
  createdAt: string;
  canCancel: boolean;
};

export type AssignedKonseling = {
  id: string;
  pokokMasalah: string;
  harapan: string;
  jadwalUsulan: string | null;
  catatanJadwal: string | null;
  preferensiGender: GenderPref;
  status: KonselingStatus;
  jadwalFinal: string | null;
  catatanKonselor: string | null;
  assignedAt: string | null;
  selesaiAt: string | null;
  dibatalkanAt: string | null;
  alasanBatal: string | null;
  createdAt: string;
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl: string | null;
    jenisKelamin: 'L' | 'P' | null;
    usia: number | null;
    cabang: string | null;
    statusPernikahan: string | null;
  } | null;
  kontak: { noHp: string | null; email: string | null; disetujuiAt: string };
};

export type KonselingHome = { items: Konseling[]; isKonselor: boolean; assignedOpen: number };

export type KonselingInput = {
  pokokMasalah: string;
  harapan: string;
  jadwalUsulan: string | null;
  catatanJadwal: string | null;
  preferensiGender: GenderPref;
  setujuBagikanKontak: true;
};

export const getKonselingHome = () => api.get<KonselingHome>('/admin/me/konseling');
export const createKonseling = (body: KonselingInput) => api.post<Konseling>('/admin/me/konseling', body);
export const getMyKonseling = (id: string) => api.get<Konseling>(`/admin/me/konseling/${id}`);
export const cancelMyKonseling = (id: string, alasan: string | null) => api.post<Konseling>(`/admin/me/konseling/${id}/cancel`, { alasan });

export const listAssignedKonseling = (status: 'aktif' | 'riwayat') =>
  api.get<AssignedKonseling[]>(`/admin/me/konseling/assigned?status=${status}`);
export const getAssignedKonseling = (id: string) => api.get<AssignedKonseling>(`/admin/me/konseling/assigned/${id}`);
export const scheduleKonseling = (id: string, jadwalFinal: string, catatanKonselor: string | null) =>
  api.post<AssignedKonseling>(`/admin/me/konseling/assigned/${id}/schedule`, { jadwalFinal, catatanKonselor });
export const doneKonseling = (id: string, catatanKonselor: string | null) =>
  api.post<AssignedKonseling>(`/admin/me/konseling/assigned/${id}/done`, { catatanKonselor });
export const releaseKonseling = (id: string, alasan: string | null) =>
  api.post<{ released: boolean }>(`/admin/me/konseling/assigned/${id}/release`, { alasan });
