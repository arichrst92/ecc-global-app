/**
 * Angka peserta di kartu event (2026-11): sebelum check-in dibuka tampil jumlah
 * TERDAFTAR, sesudahnya jumlah HADIR. Server lama (tanpa hadirCount) atau event
 * yang tidak mencatat kehadiran → tetap jumlah terdaftar.
 */
export function eventCount(
  ev: { pesertaCount: number; hadirCount?: number | null; checkinOpensAt?: string | null },
  nowMs: number,
): { count: number; attending: boolean } {
  const opens = ev.checkinOpensAt ? Date.parse(ev.checkinOpensAt) : NaN;
  if (ev.hadirCount != null && Number.isFinite(opens) && nowMs >= opens) return { count: ev.hadirCount, attending: true };
  return { count: ev.pesertaCount, attending: false };
}
