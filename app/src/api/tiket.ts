/**
 * Tiket event saya (lintas event) — GET /admin/me/event-tiket
 * Satu tiket = satu orang (saya / keluarga / tamu). QR = kode jemaat peserta.
 */
import { api } from './client';
import { syncServerClock } from '@/utils/serverClock';

export type TicketPayment = 'GRATIS' | 'LUNAS' | 'MENUNGGU' | 'BELUM_BAYAR';

export type EventTiket = {
  id: string;
  status: 'DAFTAR' | 'MENUNGGU_VERIFIKASI' | 'BAYAR' | 'HADIR' | 'BATAL';
  registeredAt: string;
  attendedAt: string | null;
  checkinMethod: string | null;
  payment: TicketPayment;
  totalBayar: number;
  isSelf: boolean;
  relasi: string | null;
  ended: boolean;
  jemaat: { id: string; namaLengkap: string; kode: string | null; fotoUrl: string | null; isTamu: boolean };
  event: {
    id: string;
    judul: string;
    slug: string;
    heroImageUrl: string | null;
    tanggalMulai: string;
    tanggalSelesai: string | null;
    jamMulai: string | null;
    jamSelesai: string | null;
    lokasi: string | null;
    mapsUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    tipeBayar: 'GRATIS' | 'NOMINAL_TETAP' | 'NOMINAL_BEBAS';
    nominal: number | null;
    cabang: { nama: string } | null;
    timezone: string;
  };
  selfCheckin: {
    enabled: boolean;
    opensAt: string | null;
    closesAt: string | null;
    venue?: { requiresLocation: boolean; radiusM: number | null };
  };
};

export type TicketScope = 'upcoming' | 'history';

export async function listMyEventTickets(scope: TicketScope, eventId?: string): Promise<EventTiket[]> {
  const startedAt = Date.now();
  const qs = new URLSearchParams({ scope, ...(eventId ? { eventId } : {}) });
  const res = await api.get<{ tickets: EventTiket[]; serverNow: string }>(`/admin/me/event-tiket?${qs.toString()}`);
  syncServerClock(res.serverNow, startedAt);
  return res.tickets;
}
