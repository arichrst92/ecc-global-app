/**
 * Waktu untuk jemaat di berbagai negara / zona waktu.
 *
 * Dua jenis waktu:
 *  1. **Instant** (ISO dari server, mis. joinedAt, opensAt, publishedAt) →
 *     selalu tampil di zona waktu HP jemaat (`localTime`, `formatInstantDate`).
 *  2. **Jam jadwal** ibadah/event ("09:00") = jam dinding di zona waktu
 *     CABANG (`cabang.timezone`, IANA). Dikonversi ke zona HP dengan
 *     `venueToLocal` / `formatVenueRange`. Kalau zona HP sama dengan zona
 *     cabang (kasus umum), jam tampil apa adanya.
 *
 * Kalau Intl tidak mendukung zona waktu (perangkat lama), konversi dilewati
 * dan jam tampil apa adanya — tidak pernah error.
 */

export const DEFAULT_VENUE_TZ = 'Asia/Jakarta';

const pad = (n: number) => String(n).padStart(2, '0');
const fmtCache = new Map<string, Intl.DateTimeFormat | null>();

function fmt(tz: string): Intl.DateTimeFormat | null {
  if (fmtCache.has(tz)) return fmtCache.get(tz)!;
  let f: Intl.DateTimeFormat | null = null;
  try {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    f = null;
  }
  fmtCache.set(tz, f);
  return f;
}

/** Zona waktu HP (IANA), mis. "Asia/Jakarta"; null kalau tidak diketahui. */
export function deviceTz(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Selisih zona `tz` terhadap UTC (menit) pada instant `at`; null kalau tidak didukung. */
export function tzOffsetMin(tz: string, at: Date): number | null {
  const f = fmt(tz);
  if (!f) return null;
  try {
    const p: Record<string, number> = {};
    for (const x of f.formatToParts(at)) if (x.type !== 'literal') p[x.type] = Number(x.value);
    const h = p.hour === 24 ? 0 : p.hour;
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, h, p.minute);
    const atMin = Math.floor(at.getTime() / 60_000) * 60_000;
    return Math.round((asUtc - atMin) / 60_000);
  } catch {
    return null;
  }
}

/** "HH:mm" instant ISO di zona waktu HP. */
export function localTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "19 Mei 2026" dari instant ISO, menurut tanggal di zona waktu HP. */
export function formatInstantDate(iso: string | null | undefined, lang: string = 'id'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = lang === 'id' ? MONTHS_ID : MONTHS_EN;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export type LocalVenueTime = {
  /** Jam di zona HP ("HH:mm"). */
  time: string;
  /** Selisih hari terhadap tanggal jadwal (mis. +1 = besoknya di zona HP). */
  dayShift: number;
  /** true kalau zona HP ≠ zona cabang (jam dikonversi). */
  converted: boolean;
};

/**
 * Jam dinding `hhmm` pada tanggal `ymd` di zona `venueTz` → jam di zona HP.
 * Tanpa `ymd` → pakai tanggal hari ini.
 */
export function venueToLocal(
  ymd: string | null | undefined,
  hhmm: string | null | undefined,
  venueTz: string | null | undefined,
): LocalVenueTime | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2})[:.](\d{2})/.exec(hhmm.trim());
  if (!m) return { time: hhmm, dayShift: 0, converted: false };
  const same = { time: `${pad(Number(m[1]))}:${m[2]}`, dayShift: 0, converted: false };
  const tz = venueTz || DEFAULT_VENUE_TZ;
  const day = (ymd ?? todayYmd()).slice(0, 10);
  const [y, mo, d] = day.split('-').map(Number);
  if (!y || !mo || !d) return same;
  const wallAsUtc = Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2]));
  const off1 = tzOffsetMin(tz, new Date(wallAsUtc));
  if (off1 === null) return same;
  let instant = wallAsUtc - off1 * 60_000;
  const off2 = tzOffsetMin(tz, new Date(instant));
  if (off2 !== null && off2 !== off1) instant = wallAsUtc - off2 * 60_000;
  const local = new Date(instant);
  const localOff = -local.getTimezoneOffset();
  const venueOff = off2 ?? off1;
  if (localOff === venueOff) return same;
  const localMidnight = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
  return {
    time: `${pad(local.getHours())}:${pad(local.getMinutes())}`,
    dayShift: Math.round((localMidnight - Date.UTC(y, mo - 1, d)) / 86_400_000),
    converted: true,
  };
}

const shiftMark = (n: number) => (n > 0 ? ` (+${n})` : n < 0 ? ` (${n})` : '');

/** "09:00 - 11:00" di zona HP (dengan penanda hari "(+1)" kalau bergeser). */
export function formatVenueRange(
  ymd: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  venueTz: string | null | undefined,
  sep = ' - ',
): string {
  const a = venueToLocal(ymd, start, venueTz);
  if (!a) return '';
  const b = end && end !== start ? venueToLocal(ymd, end, venueTz) : null;
  const left = `${a.time}${b && b.dayShift !== a.dayShift ? shiftMark(a.dayShift) : ''}`;
  if (!b) return `${a.time}${shiftMark(a.dayShift)}`;
  return `${left}${sep}${b.time}${shiftMark(b.dayShift)}`;
}

/** Nama kota dari zona IANA: "Australia/Sydney" → "Sydney". */
export function tzCity(tz: string | null | undefined): string {
  const s = (tz || DEFAULT_VENUE_TZ).split('/').pop() ?? '';
  return s.replace(/_/g, ' ');
}

/**
 * Keterangan jam asli cabang kalau zona HP berbeda, mis.
 * "09:00 - 11:00 waktu Jakarta". null kalau zona sama.
 */
export function venueTimeHint(
  ymd: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  venueTz: string | null | undefined,
  label: (p: { time: string; city: string }) => string,
): string | null {
  const a = venueToLocal(ymd, start, venueTz);
  if (!a?.converted) return null;
  const raw = end && end !== start ? `${start} - ${end}` : (start ?? '');
  return label({ time: raw, city: tzCity(venueTz) });
}
