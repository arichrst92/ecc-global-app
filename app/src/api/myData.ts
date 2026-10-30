/**
 * Hak jemaat atas datanya (kepatuhan no. 6 & 19).
 *   POST /admin/me/export/link   → link 10 menit ke PDF salinan data pribadi
 *   GET/PUT /admin/me/communication → preferensi pesan WhatsApp
 */
import { api } from './client';

export interface CommPrefs {
  waReminders: boolean;
  waGreetings: boolean;
  waUpdates: boolean;
}

export const createMyDataLink = () => api.post<{ url: string; expiresInSec: number }>('/admin/me/export/link');
export const getCommPrefs = () => api.get<CommPrefs>('/admin/me/communication');
export const updateCommPrefs = (body: Partial<CommPrefs>) => api.put<CommPrefs>('/admin/me/communication', body);
