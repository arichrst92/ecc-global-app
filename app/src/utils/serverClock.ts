/**
 * Jam server untuk logika berbasis waktu (mis. self check-in ibadah).
 *
 * Jam HP jemaat bisa salah / beda zona waktu. Server mengirim `serverNow`
 * (ISO UTC); kita simpan selisihnya lalu semua perhitungan waktu memakai
 * `serverNowMs()` = Date.now() + selisih. Validasi akhir tetap di server.
 */
let offsetMs = 0;

/** Panggil saat menerima respons yang berisi `serverNow`. */
export function syncServerClock(serverNowIso: string | null | undefined, requestStartedAt?: number) {
  if (!serverNowIso) return;
  const server = Date.parse(serverNowIso);
  if (Number.isNaN(server)) return;
  const now = Date.now();
  // Koreksi latensi: anggap server menjawab di tengah perjalanan request.
  const local = requestStartedAt ? (requestStartedAt + now) / 2 : now;
  offsetMs = server - local;
}

export const serverNowMs = () => Date.now() + offsetMs;
export const serverOffsetMs = () => offsetMs;

/** @deprecated pakai `localTime` (zona waktu HP) dari '@/utils/time'. */
export { localTime as wibTime } from './time';

/**
 * Status self check-in "sekarang" menurut jam server. Hanya alasan berbasis
 * waktu (belum buka / sudah lewat) yang dihitung ulang di HP; alasan lain
 * (bukan hari ibadah, dibatalkan, ibadah anak) tetap dari server.
 */
export function selfCheckinOpenNow(
  d: { available: boolean; reason: string | null; opensAt: string | null; closesAt: string | null } | undefined,
  nowMs: number = serverNowMs(),
): boolean {
  if (!d) return false;
  const timeBased = d.reason === null || d.reason === 'TOO_EARLY' || d.reason === 'ENDED';
  if (!timeBased || !d.opensAt || !d.closesAt) return d.available;
  return nowMs >= Date.parse(d.opensAt) && nowMs <= Date.parse(d.closesAt);
}
