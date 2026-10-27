/** Bible 365 — program baca Alkitab 365 hari — /admin/me/bible365 */
import { api } from './client';

export type Bible365Status = 'AKTIF' | 'SELESAI' | 'DIHENTIKAN';

export type Bible365PlanBase = {
  id: string;
  putaran: number;
  startDate: string;
  status: Bible365Status;
  completedAt: string | null;
  stoppedAt: string | null;
  reminderTime: string | null;
  createdAt: string;
};

export type Bible365Summary = {
  today: number;
  totalDays: number;
  totalChapters: number;
  readCount: number;
  completedDays: number;
  percent: number;
  streak: number;
  behindDays: number[];
  behindCount: number;
  notesCount: number;
  noteDays: number[];
  /** 365 karakter: '2' selesai, '1' sebagian, '0' belum. */
  dayStatus: string;
};

export type Bible365Plan = Bible365PlanBase & Bible365Summary;

export type Bible365State = { plan: Bible365Plan | null; history: Bible365PlanBase[] };

export type Bible365Note = { day?: number; isi: string; ayat: string | null; updatedAt: string };

export type Bible365Day = {
  day: number;
  date: string;
  chapters: { bookId: number; bab: number; read: boolean }[];
  note: Bible365Note | null;
};

export type Bible365JournalItem = {
  day: number;
  date: string;
  isi: string;
  ayat: string | null;
  updatedAt: string;
  chapters: { bookId: number; bab: number }[];
};

export const BIBLE365_KEY = ['bible365'] as const;

const B = '/admin/me/bible365';

export const getBible365 = () => api.get<Bible365State>(B);
export const startBible365 = (reminderTime: string | null) => api.post<Bible365State>(`${B}/start`, { reminderTime });
export const stopBible365 = () => api.post<Bible365State>(`${B}/stop`, {});
export const getBible365Day = (day: number) => api.get<Bible365Day>(`${B}/days/${day}`);
export const markBible365Read = (bookId: number, bab: number, read: boolean) =>
  api.post<Bible365Summary & { day: number }>(`${B}/read`, { bookId, bab, read });
export const completeBible365Day = (day: number) => api.post<Bible365Summary & { day: number }>(`${B}/days/${day}/complete`, {});
export const saveBible365Note = (day: number, isi: string, ayat: string | null) =>
  api.put<Bible365Note>(`${B}/notes/${day}`, { isi, ayat });
export const deleteBible365Note = (day: number) => api.delete<void>(`${B}/notes/${day}`);
export const listBible365Notes = (cursor?: number | null) =>
  api.get<{ items: Bible365JournalItem[]; nextCursor: number | null }>(`${B}/notes${cursor ? `?cursor=${cursor}` : ''}`);
export const setBible365Reminder = (reminderTime: string | null) =>
  api.patch<{ reminderTime: string | null }>(`${B}/reminder`, { reminderTime });
