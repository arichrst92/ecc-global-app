/**
 * Aturan isi input (audit 2026-11) — sama dengan server
 * (core-platform packages/shared-types/src/schemas/input-rules.ts).
 * Fungsi `cek*` mengembalikan pesan error (sudah diterjemahkan) atau null.
 */
import i18n from '@/i18n';

// Regex Unicode property (\p{L}) dibuat saat runtime dgn cadangan rentang Latin,
// supaya engine JS yang belum mendukungnya tidak crash saat modul dimuat.
const L_FALLBACK = 'A-Za-z\\u00C0-\\u024F\\u1E00-\\u1EFF';
function re(unicodeSrc: string, fallbackSrc: string, flags: string): RegExp {
  try {
    return new RegExp(unicodeSrc, flags + 'u');
  } catch {
    return new RegExp(fallbackSrc, flags);
  }
}
const HURUF = re('\\p{L}', `[${L_FALLBACK}]`, 'g');
const HURUF_ANGKA = re('[\\p{L}\\p{N}]', `[${L_FALLBACK}0-9]`, 'g');
const NAMA_RE = re("^[\\p{L}\\p{M}][\\p{L}\\p{M} .,'’()\\-]*$", `^[${L_FALLBACK}][${L_FALLBACK} .,'’()\\-]*$`, '');
const ULANG_RE = re('(\\p{L})\\1{3,}', `([${L_FALLBACK}])\\1{3,}`, 'i');
export const HURUF_SATU = re('\\p{L}', `[${L_FALLBACK}]`, '');

export const rapikan = (s: string) => s.trim().replace(/\s+/g, ' ');

export function namaOrangValid(s: string): boolean {
  if (!NAMA_RE.test(s)) return false;
  if ((s.match(HURUF) ?? []).length < 2) return false;
  if (ULANG_RE.test(s.replace(/\s/g, ''))) return false;
  return true;
}

export function teksBermakna(s: string, minHurufAngka = 2): boolean {
  const ha = s.match(HURUF_ANGKA) ?? [];
  if (ha.length < minHurufAngka) return false;
  if (new Set(ha.map((c) => c.toLowerCase())).size === 1 && ha.length >= 3) return false;
  return true;
}

export const adaHuruf = (s: string, min = 2) => (s.match(HURUF) ?? []).length >= min;

const t = (k: string, o?: Record<string, unknown>) => i18n.t(`input_rules.${k}`, o);

/** Nama orang (wajib bila `wajib`). */
export function cekNama(v: string, wajib = true): string | null {
  const s = rapikan(v);
  if (!s) return wajib ? t('nama_wajib') : null;
  if (s.length < 2) return t('nama_pendek');
  return namaOrangValid(s) ? null : t('nama');
}

/** Teks bebas bermakna (bukan hanya simbol). */
export function cekTeks(v: string, opts: { wajib?: boolean; min?: number; minHurufAngka?: number; label?: string } = {}): string | null {
  const s = rapikan(v);
  const label = opts.label ?? t('isian');
  if (!s) return opts.wajib ? t('wajib', { label }) : null;
  if (s.length < (opts.min ?? 2)) return t('min', { label, n: opts.min ?? 2 });
  return teksBermakna(s, opts.minHurufAngka ?? 2) ? null : t('teks', { label });
}

/** Teks yang harus berisi huruf (nama kantor, usaha, tempat, industri). */
export function cekHuruf(v: string, opts: { wajib?: boolean; label?: string } = {}): string | null {
  const s = rapikan(v);
  const label = opts.label ?? t('isian');
  if (!s) return opts.wajib ? t('wajib', { label }) : null;
  return adaHuruf(s) ? null : t('huruf', { label });
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Tanggal lahir: tidak di masa depan & ≤ 120 tahun lalu. */
export function cekTanggalLahir(d: Date | null | undefined): string | null {
  if (!d) return null;
  const now = new Date();
  if (ymd(d) > ymd(now)) return t('lahir_masa_depan');
  const batas = new Date(now);
  batas.setFullYear(now.getFullYear() - 120);
  if (ymd(d) < ymd(batas)) return t('lahir_lama');
  return null;
}

/** Tanggal pernikahan: tidak di masa depan, ≥ 15 tahun setelah lahir, tidak untuk Single. */
export function cekTanggalNikah(nikah: Date | null | undefined, lahir: Date | null | undefined, status: string | null | undefined): string | null {
  if (!nikah) return null;
  if (!status || status === 'Single') return t('nikah_single');
  if (ymd(nikah) > ymd(new Date())) return t('nikah_masa_depan');
  if (lahir) {
    const min = new Date(lahir);
    min.setFullYear(min.getFullYear() + 15);
    if (ymd(nikah) < ymd(min)) return t('nikah_usia');
  }
  return null;
}

/** Usia (angka) dalam rentang wajar. */
export function cekUsia(v: string, min = 5, max = 110): string | null {
  const s = v.trim();
  if (!s) return null;
  if (!/^\d{1,3}$/.test(s)) return t('usia_angka');
  const n = Number(s);
  return n < min || n > max ? t('usia_rentang', { min, max }) : null;
}

/** Nominal rupiah (angka bulat > 0). */
export function cekNominal(v: string, min = 1): string | null {
  const s = v.replace(/[.\s]/g, '');
  if (!s) return null;
  if (!/^\d+$/.test(s)) return t('nominal_angka');
  return Number(s) < min ? t('nominal_min', { min: min.toLocaleString('id-ID') }) : null;
}

/** URL http(s). */
export function cekUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  return /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(s) ? null : t('url');
}

/** Hanya angka — untuk menyaring ketikan (usia, nominal). */
export const hanyaAngka = (v: string) => v.replace(/\D/g, '');

/** Kumpulkan hasil cek → pesan pertama yang gagal (atau null). */
export function pertamaGagal(...hasil: (string | null)[]): string | null {
  return hasil.find((x) => !!x) ?? null;
}
