/** Kritik & Saran saya — /admin/me/feedback */
import { api } from './client';

export type FeedbackTipe = 'KRITIK' | 'SARAN';
export type FeedbackStatus = 'BARU' | 'DIPROSES' | 'SELESAI';
export const FEEDBACK_KATEGORI = ['APLIKASI', 'IBADAH', 'PELAYANAN', 'EVENT', 'HOMECELL', 'LAINNYA'] as const;
export type FeedbackKategori = (typeof FEEDBACK_KATEGORI)[number];

export type MyFeedback = {
  id: string;
  tipe: FeedbackTipe;
  kategori: FeedbackKategori;
  isi: string;
  status: FeedbackStatus;
  unreadForUser: boolean;
  createdAt: string;
  lastActivityAt: string;
  replyCount: number;
};

export type FeedbackReply = {
  id: string;
  isi: string;
  fromAdmin: boolean;
  createdAt: string;
};

export type MyFeedbackDetail = Omit<MyFeedback, 'replyCount'> & { replies: FeedbackReply[] };

export const listMyFeedback = () => api.get<MyFeedback[]>('/admin/me/feedback');
export const getMyFeedback = (id: string) => api.get<MyFeedbackDetail>(`/admin/me/feedback/${id}`);
export const sendFeedback = (body: { tipe: FeedbackTipe; kategori: FeedbackKategori; isi: string; appInfo?: string }) =>
  api.post<MyFeedback>('/admin/me/feedback', body);
export const replyMyFeedback = (id: string, isi: string) =>
  api.post<FeedbackReply>(`/admin/me/feedback/${id}/replies`, { isi });
