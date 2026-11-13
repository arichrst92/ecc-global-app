import i18n from '@/i18n';

const HARI_KEYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;

/**
 * Nama hari dari enum server ("MINGGU", "SENIN", …) → label sesuai bahasa app
 * ("Minggu" / "Sunday"). Nilai lain (teks bebas) di-title-case apa adanya.
 */
export function hariLabel(hari?: string | null): string {
  if (!hari) return '';
  const key = hari.trim().toUpperCase();
  if ((HARI_KEYS as readonly string[]).includes(key)) return i18n.t(`common.day_${key}`);
  return hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
}

/** Opsi picker hari (value = enum server, label = bahasa app). */
export function hariOptions(): { value: string; label: string }[] {
  return [{ value: '', label: '—' }, ...HARI_KEYS.map((k) => ({ value: k, label: i18n.t(`common.day_${k}`) }))];
}

/** Locale tanggal sesuai bahasa app. */
export function dateLocale(): string {
  return i18n.language === 'en' ? 'en-GB' : 'id-ID';
}

/** "Rp 50rb" / "Rp 50K" — ringkas nominal ribuan sesuai bahasa. */
export function rupiahShort(num: number): string {
  if (num >= 1000) return `Rp ${(num / 1000).toLocaleString('id-ID')}${i18n.language === 'en' ? 'K' : 'rb'}`;
  return `Rp ${num.toLocaleString('id-ID')}`;
}
