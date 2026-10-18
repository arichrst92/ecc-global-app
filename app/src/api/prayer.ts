/** Doa (Prayer Request) & Resolusi Tahunan — /admin/me/prayer, /admin/me/resolusi */
import { api } from './client';

export const PRAYER_KATEGORI = [
  'HEALTH',
  'FAMILY',
  'WORK',
  'FINANCE',
  'STUDY',
  'RELATIONSHIP',
  'RESTORATION',
  'THANKSGIVING',
  'OTHER',
] as const;
export type PrayerKategori = (typeof PRAYER_KATEGORI)[number];
export const PRAYER_TARGET = ['DIRI_SENDIRI', 'KELUARGA', 'ORANG_LAIN'] as const;
export type PrayerTarget = (typeof PRAYER_TARGET)[number];
export type PrayerDisplayStatus = 'BARU' | 'DITUGASKAN' | 'SUDAH_DIDOAKAN' | 'TERJAWAB';

export type Prayer = {
  id: string;
  kategori: PrayerKategori;
  untuk: PrayerTarget;
  untukNama: string | null;
  untukJemaatId: string | null;
  isi: string;
  isAnonim: boolean;
  status: 'BARU' | 'DITUGASKAN' | 'SUDAH_DIDOAKAN';
  displayStatus: PrayerDisplayStatus;
  assignedAt: string | null;
  didoakanAt: string | null;
  catatanPetugas: string | null;
  terjawabAt: string | null;
  kesaksian: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
};

export type AssignedPrayer = Prayer & {
  pengirim: { id: string; namaLengkap: string; fotoUrl: string | null } | null;
  cabang: { id: string; nama: string } | null;
};

export type PrayerSummary = { isPetugas: boolean; assignedPending: number; aktif: number; terjawab: number };

export type PrayerInput = {
  kategori: PrayerKategori;
  untuk: PrayerTarget;
  untukNama: string | null;
  untukJemaatId: string | null;
  isi: string;
  isAnonim: boolean;
};

export const listMyPrayers = (tab: 'aktif' | 'terjawab') => api.get<Prayer[]>(`/admin/me/prayer?tab=${tab}`);
export const getPrayerSummary = () => api.get<PrayerSummary>('/admin/me/prayer/summary');
export const getMyPrayer = (id: string) => api.get<Prayer>(`/admin/me/prayer/${id}`);
export const createPrayer = (body: PrayerInput) => api.post<Prayer>('/admin/me/prayer', body);
export const updatePrayer = (id: string, body: PrayerInput) => api.patch<Prayer>(`/admin/me/prayer/${id}`, body);
export const deletePrayer = (id: string) => api.delete<unknown>(`/admin/me/prayer/${id}`);
export const markPrayerAnswered = (id: string, answered: boolean, kesaksian?: string | null) =>
  api.post<Prayer>(`/admin/me/prayer/${id}/answered`, { answered, kesaksian: kesaksian ?? null });

export const listAssignedPrayers = (tab: 'pending' | 'done') =>
  api.get<AssignedPrayer[]>(`/admin/me/prayer/assigned?tab=${tab}`);
export const getAssignedPrayer = (id: string) => api.get<AssignedPrayer>(`/admin/me/prayer/assigned/${id}`);
export const markPrayed = (id: string, catatan: string | null) =>
  api.post<AssignedPrayer>(`/admin/me/prayer/assigned/${id}/prayed`, { catatan });

// ── Resolusi ────────────────────────────────────────────────
export const RESOLUSI_KATEGORI = [
  'SPIRITUAL',
  'FAMILY',
  'HEALTH',
  'CAREER',
  'FINANCE',
  'MINISTRY',
  'PERSONAL_GROWTH',
  'OTHER',
] as const;
export type ResolusiKategori = (typeof RESOLUSI_KATEGORI)[number];

export type Resolusi = {
  id: string;
  tahun: number;
  judul: string;
  catatan: string | null;
  kategori: ResolusiKategori;
  isDone: boolean;
  doneAt: string | null;
  urutan: number;
};
export type ResolusiYear = {
  tahun: number;
  years: { tahun: number; total: number }[];
  items: Resolusi[];
  progress: { done: number; total: number };
};

export const getResolusi = (tahun: number) => api.get<ResolusiYear>(`/admin/me/resolusi?tahun=${tahun}`);
export const createResolusi = (body: {
  tahun: number;
  judul: string;
  kategori: ResolusiKategori;
  catatan: string | null;
  isDone?: boolean;
}) => api.post<Resolusi>('/admin/me/resolusi', body);
export const updateResolusi = (
  id: string,
  body: Partial<{ judul: string; kategori: ResolusiKategori; catatan: string | null; isDone: boolean }>,
) => api.patch<Resolusi>(`/admin/me/resolusi/${id}`, body);
export const deleteResolusi = (id: string) => api.delete<unknown>(`/admin/me/resolusi/${id}`);
export const reorderResolusi = (ids: string[]) => api.post<unknown>('/admin/me/resolusi/reorder', { ids });
