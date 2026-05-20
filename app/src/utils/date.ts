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

/** Format "19 Mei 2026" */
export function formatDate(iso: string, lang: string = 'id'): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = getMonths(lang);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format "Minggu, 19 Mei 2026" */
export function formatDateWithDay(iso: string, lang: string = 'id'): string {
  const d = new Date(iso);
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
