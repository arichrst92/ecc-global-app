/**
 * Hak jemaat atas datanya (kepatuhan no. 6 & 19).
 *   GET /admin/me/export         → salinan data pribadi (JSON)
 *   GET/PUT /admin/me/communication → preferensi pesan WhatsApp
 */
import { api } from './client';

export interface CommPrefs {
  waReminders: boolean;
  waGreetings: boolean;
  waUpdates: boolean;
}

export const getMyDataExport = () => api.get<Record<string, unknown>>('/admin/me/export');
export const getCommPrefs = () => api.get<CommPrefs>('/admin/me/communication');
export const updateCommPrefs = (body: Partial<CommPrefs>) => api.put<CommPrefs>('/admin/me/communication', body);
