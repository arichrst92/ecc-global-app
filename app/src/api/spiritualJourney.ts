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

export type MyJourney = {
  total: number;
  achievedCount: number;
  nextIndex: number | null;
  steps: JourneyStep[];
};

export const getMyJourney = () => api.get<MyJourney>('/admin/me/spiritual-journey');
