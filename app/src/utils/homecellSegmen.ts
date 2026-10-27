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
