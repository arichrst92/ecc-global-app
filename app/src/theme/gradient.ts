/**
 * Gradient oranye brand — sama dengan bottom dock portal
 * (`bg-gradient-to-br from-brand-500 to-brand-700`).
 *
 * React Native 0.81 (New Architecture) menggambar gradient lewat style
 * `experimental_backgroundImage`; web memakai CSS `backgroundImage`. Warna
 * `bg-brand-500` dari className tetap ada sebagai cadangan kalau gradient
 * tidak didukung.
 *
 * Pakai `gx(className, style?)` di elemen yang className-nya berisi
 * `bg-brand-500`/`bg-brand-600`: `<View {...gx('bg-brand-500 p-4')} />`.
 * Gradient hanya dipasang kalau kelas itu benar-benar aktif (aman untuk
 * className kondisional, mis. tab terpilih).
 */
import { Platform, type ViewStyle } from 'react-native';

import { isDark } from './ThemeRoot';

export const BRAND_GRADIENT = 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)';
/** Mode gelap: nada sedikit lebih gelap supaya tidak menyilaukan. */
export const BRAND_GRADIENT_DARK = 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)';

/**
 * Gradient aktif di semua platform. (2.4.2 sempat mematikan iOS karena dicurigai
 * crash — ternyata penyebab crash 2.4.1 adalah teks izin Reminders yang hilang.
 * Diaktifkan lagi di 2.4.3; set false di sini bila perlu mematikan cepat.)
 */
export const GRADIENT_ENABLED = true;

const toStyle = (g: string): ViewStyle =>
  (!GRADIENT_ENABLED
    ? {}
    : Platform.OS === 'web'
      ? { backgroundImage: g }
      : { experimental_backgroundImage: g }) as ViewStyle;
const LIGHT_STYLE = toStyle(BRAND_GRADIENT);
const DARK_STYLE = toStyle(BRAND_GRADIENT_DARK);

/** Style gradient brand sesuai mode aktif (panggil saat render). */
export const brandGradient = (): ViewStyle => (isDark() ? DARK_STYLE : LIGHT_STYLE);

const HAS_BRAND_BG = /(^|\s)bg-brand-(500|600)(\s|$)/;

/** className + style dengan gradient brand bila className memuat bg-brand-500/600. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gx(className: string | false | null | undefined, style?: any): { className?: string; style?: any } {
  const cls = className || undefined;
  if (!GRADIENT_ENABLED || !cls || !HAS_BRAND_BG.test(cls)) return { className: cls, style };
  if (typeof style === 'function') {
    // Pressable: style={({ pressed }) => ...}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { className: cls, style: (state: any) => [brandGradient(), style(state)] };
  }
  const g = brandGradient();
  return { className: cls, style: style ? [g, style] : g };
}
