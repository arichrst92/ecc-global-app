/**
 * Date formatting utilities — i18n-aware.
 * Untuk display di app: '19 Mei 2026' (id) / '19 May 2026' (en).
 */

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonths(lang: string): readonly string[] {
  return lang === 'id' ? MONTHS_ID : MONTHS_EN;
}
function getDays(lang: string): readonly string[] {
  return lang === 'id' ? DAYS_ID : DAYS_EN;
}

/**
 * Parse ISO string SECARA TIMEZONE-SAFE — extract YYYY-MM-DD portion saja,
 * lalu construct Date di LOCAL timezone (bukan UTC).
 *
 * Kenapa: BE kadang return tanggal sebagai full datetime ISO (mis.
 * "2026-05-22T17:00:00.000Z"). `new Date(iso)` akan parse UTC lalu convert
 * ke local — jadi tanggal bisa shift jadi May 23 di WIB. Kalau yang dimaksud
 * adalah "tanggal kalender May 22" (event/ibadah dijadwalkan tanggal 22),
 * pakai parser ini supaya tanggal selalu sesuai dengan yang ditampilkan BE.
 *
 * Format input yang di-support:
 * - "2026-05-22" → Date local May 22 00:00
 * - "2026-05-22T17:00:00.000Z" → Date local May 22 00:00 (ignore time + TZ)
 * - "2026-05-22T09:30:00+07:00" → Date local May 22 00:00
 */
export function parseLocalDate(iso: string): Date {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(iso); // fallback ke standard parsing
  const [, y, mm, d] = m;
  return new Date(parseInt(y, 10), parseInt(mm, 10) - 1, parseInt(d, 10));
}

/** Format "19 Mei 2026" — pakai parseLocalDate biar TZ-safe. */
export function formatDate(iso: string, lang: string = 'id'): string {
  const d = parseLocalDate(iso);
  if (isNaN(d.getTime())) return iso;
  const months = getMonths(lang);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format "Minggu, 19 Mei 2026" — pakai parseLocalDate biar TZ-safe. */
export function formatDateWithDay(iso: string, lang: string = 'id'): string {
  const d = parseLocalDate(iso);
  if (isNaN(d.getTime())) return iso;
  const days = getDays(lang);
  return `${days[d.getDay()]}, ${formatDate(iso, lang)}`;
}

/** Format ISO date YYYY-MM-DD dari Date object — local time, bukan UTC */
export function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Today di local time, format YYYY-MM-DD */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Tambah N hari, return ISO date */
export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Group items by date key. Item harus punya field `tanggal` (string) */
export function groupByDate<T extends { tanggal: string }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    if (!out[item.tanggal]) out[item.tanggal] = [];
    out[item.tanggal].push(item);
  }
  return out;
}

/** Today check */
export function isToday(iso: string): boolean {
  return iso === todayIso();
}
