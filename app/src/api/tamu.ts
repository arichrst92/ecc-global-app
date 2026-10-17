/**
 * Tamu — teman non-anggota (tanpa akun) yang saya ajak, plus walk-in petugas.
 * Lihat docs/be-update-2026-10-14-tamu.md.
 */
import { api } from './client';

export type TamuStatus = 'DIUNDANG' | 'TERLIBAT' | 'FOLLOWUP' | 'TERDAFTAR';

export type Tamu = {
  id: string;
  namaLengkap: string;
  noHp: string | null;
  kode: string | null;
  isReturning?: boolean;
  /** BE 2026-10-17 — dari GET /admin/me/tamu. */
  isTamu?: boolean;
  addedAt?: string;
  status?: TamuStatus;
  statusLabel?: string;
  kehadiran?: number;
  terakhirHadir?: string | null;
  /** Ibadah / event terakhir yang dihadiri. */
  terakhirAcara?: { jenis: 'IBADAH' | 'EVENT'; id: string; nama: string; tanggal: string } | null;
};

export const listMyTamu = () => api.get<Tamu[]>('/admin/me/tamu');
export const addMyTamu = (body: { nama: string; noHp: string }) => api.post<Tamu>('/admin/me/tamu', body);
export const removeMyTamu = (id: string) => api.delete<{ id: string }>(`/admin/me/tamu/${id}`);

export type WalkInBayar = 'TUNAI' | 'TRANSFER' | 'QRIS' | 'GRATIS';
export type WalkInResult = {
  jemaat: { id: string; namaLengkap: string };
  isMember: boolean;
  isReturningGuest?: boolean;
};

/** Petugas event — catat tamu walk-in langsung HADIR. */
export const walkInGuestEvent = (
  eventId: string,
  body: { nama: string; noHp: string; pembayaran?: WalkInBayar; nominal?: number; force?: boolean },
) => api.post<WalkInResult>(`/admin/event/${eventId}/walk-in-guest`, body);

/** Petugas ibadah — catat tamu walk-in langsung hadir (bukan ibadah anak). */
export const walkInGuestIbadah = (body: { ibadahId: string; tanggalIbadah: string; nama: string; noHp: string }) =>
  api.post<WalkInResult>('/admin/reservasi/walk-in-guest', body);
