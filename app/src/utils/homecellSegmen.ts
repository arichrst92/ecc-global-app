/** Label segmen homecell: kategori (Single/Couple) + rentang usia. */
import i18n from '@/i18n';

export function homecellUsiaLabel(min?: number | null, max?: number | null): string | null {
  const th = i18n.t('hcj.years');
  if (min != null && max != null) return min === max ? `${min} ${th}` : `${min}–${max} ${th}`;
  if (min != null) return `≥ ${min} ${th}`;
  if (max != null) return `≤ ${max} ${th}`;
  return null;
}

export function homecellKategoriLabel(k?: 'SINGLE' | 'COUPLE' | null): string | null {
  if (k === 'SINGLE') return i18n.t('hcj.kategori_single');
  if (k === 'COUPLE') return i18n.t('hcj.kategori_couple');
  return null;
}

/**
 * Indikator kehadiran homecell (sama dengan portal):
 * merah 0–25% · oranye 26–50% · kuning 51–75% · hijau 76–100%.
 */
export const ATTENDANCE_TIERS = [
  { key: 'merah', max: 25, bg: 'bg-red-100', fg: 'text-red-700', dot: '#DC2626', label: '0–25%' },
  { key: 'oranye', max: 50, bg: 'bg-orange-100', fg: 'text-orange-700', dot: '#EA580C', label: '26–50%' },
  { key: 'kuning', max: 75, bg: 'bg-yellow-100', fg: 'text-yellow-800', dot: '#CA8A04', label: '51–75%' },
  { key: 'hijau', max: 100, bg: 'bg-green-100', fg: 'text-green-700', dot: '#16A34A', label: '76–100%' },
] as const;

export function attendanceTier(pct: number) {
  return ATTENDANCE_TIERS.find((x) => pct <= x.max) ?? ATTENDANCE_TIERS[3];
}
