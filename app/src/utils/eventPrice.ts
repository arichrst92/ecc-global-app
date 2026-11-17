/**
 * Label & warna harga event — SATU sumber untuk Beranda, daftar event,
 * detail, dan tampilan tamu supaya seragam.
 *   GRATIS        → "Gratis"     hijau
 *   NOMINAL_BEBAS → "Sukarela"   biru
 *   NOMINAL_TETAP → "Rp 350rb"   kuning
 */
import { rupiahShort } from '@/utils/hari';
import type { TipeBayar } from '@/types/event';

export function eventPriceLabel(
  e: { tipeBayar: TipeBayar; nominal?: string | number | null },
  t: (k: string) => string,
  opts: { full?: boolean } = {},
): string {
  if (e.tipeBayar === 'GRATIS') return t('event.free');
  if (e.tipeBayar === 'NOMINAL_BEBAS') return t('event.price_voluntary');
  const n = Number(e.nominal ?? 0);
  return opts.full ? `Rp ${n.toLocaleString('id-ID')}` : rupiahShort(n);
}

export function eventPriceTone(tipe: TipeBayar) {
  if (tipe === 'GRATIS') return { text: 'text-emerald-700', soft: 'bg-emerald-50', solid: 'bg-emerald-500', fg: 'text-emerald-600' };
  if (tipe === 'NOMINAL_BEBAS') return { text: 'text-blue-700', soft: 'bg-blue-50', solid: 'bg-blue-500', fg: 'text-blue-600' };
  return { text: 'text-amber-700', soft: 'bg-amber-50', solid: 'bg-amber-500', fg: 'text-amber-600' };
}
