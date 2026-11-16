/**
 * Announcement (pengumuman dari Portal) — /admin/me/announcements
 *  - popup: yang belum ditutup (maks 30 hari)
 *  - detail: isi lengkap (tandai dibaca)
 *  - dismiss: popup ditutup, tidak muncul lagi
 */
import { api } from './client';

export type AnnouncementLink = { label: string; url: string };
export type Announcement = {
  id: string;
  judul: string;
  /** Markdown */
  isi: string;
  bannerUrl: string | null;
  links: AnnouncementLink[];
  sentAt: string | null;
  publicUrl: string;
};

export const getAnnouncementPopup = () => api.get<Announcement[]>('/admin/me/announcements/popup');
export const getAnnouncement = (id: string) => api.get<Announcement>(`/admin/me/announcements/${id}`);
export const dismissAnnouncement = (id: string) => api.post<{ dismissed: boolean }>(`/admin/me/announcements/${id}/dismiss`, {});
