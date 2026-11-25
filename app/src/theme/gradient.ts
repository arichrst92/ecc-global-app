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

/**
 * 2.5.1 — gradient untuk warna lain di GUI (hijau, kuning, ungu, merah, biru,
 * biru langit): arah & pola sama dengan oranye (nada 500 → 700). Dipasang
 * hanya pada elemen yang memakai gx() (bagian, tombol, kotak ikon, label) —
 * bar progres, titik, sakelar, dan kotak centang tetap polos.
 */
const COLOR_STOPS: Record<string, { light: [string, string]; dark: [string, string] }> = {
  emerald: { light: ['#10B981', '#047857'], dark: ['#059669', '#065F46'] },
  green: { light: ['#22C55E', '#15803D'], dark: ['#16A34A', '#166534'] },
  amber: { light: ['#F59E0B', '#B45309'], dark: ['#D97706', '#92400E'] },
  violet: { light: ['#8B5CF6', '#6D28D9'], dark: ['#7C3AED', '#5B21B6'] },
  red: { light: ['#EF4444', '#B91C1C'], dark: ['#DC2626', '#991B1B'] },
  blue: { light: ['#3B82F6', '#1D4ED8'], dark: ['#2563EB', '#1E40AF'] },
  sky: { light: ['#0EA5E9', '#0369A1'], dark: ['#0284C7', '#075985'] },
};

const alphaHex = (opacity?: number) =>
  opacity == null || opacity >= 100 ? '' : Math.round((opacity / 100) * 255).toString(16).padStart(2, '0').toUpperCase();

const cache = new Map<string, ViewStyle>();
/** Style gradient untuk warna Tailwind (emerald, amber, …), opsional transparansi (mis. 80). */
export function colorGradient(color: string, opacity?: number): ViewStyle {
  const stops = COLOR_STOPS[color];
  if (!stops) return {};
  const dark = isDark();
  const key = `${color}|${opacity ?? ''}|${dark}`;
  let st = cache.get(key);
  if (!st) {
    const [a, b] = dark ? stops.dark : stops.light;
    const al = alphaHex(opacity);
    st = toStyle(`linear-gradient(135deg, ${a}${al} 0%, ${b}${al} 100%)`);
    cache.set(key, st);
  }
  return st;
}

/**
 * Gradient dari satu warna hex (warna ministry dari Portal): warna → lebih
 * gelap (`factor` 0.75 = 25% lebih gelap; 0.9 untuk latar pastel).
 */
export function hexGradient(hex: string, factor = 0.75): ViewStyle {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return {};
  const n = parseInt(m[1]!, 16);
  const d = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  const darker = `#${d((n >> 16) & 255)}${d((n >> 8) & 255)}${d(n & 255)}`;
  return toStyle(`linear-gradient(135deg, ${hex} 0%, ${darker} 100%)`);
}

const HAS_BRAND_BG = /(^|\s)bg-brand-(500|600)(\s|$)/;
const HAS_COLOR_BG = /(?:^|\s)bg-(emerald|green|amber|violet|red|blue|sky)-(500|600)(?:\/(\d+))?(?=\s|$)/;

/**
 * className + style dengan gradient bila className memuat bg-brand-500/600
 * (oranye) atau bg-{emerald|green|amber|violet|red|blue|sky}-500/600 (2.5.1).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gx(className: string | false | null | undefined, style?: any): { className?: string; style?: any } {
  const cls = className || undefined;
  if (!GRADIENT_ENABLED || !cls) return { className: cls, style };
  let g: ViewStyle | null = null;
  if (HAS_BRAND_BG.test(cls)) g = brandGradient();
  else {
    const m = HAS_COLOR_BG.exec(cls);
    if (m) g = colorGradient(m[1]!, m[3] ? Number(m[3]) : undefined);
  }
  if (!g) return { className: cls, style };
  const gs = g;
  if (typeof style === 'function') {
    // Pressable: style={({ pressed }) => ...}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { className: cls, style: (state: any) => [gs, style(state)] };
  }
  return { className: cls, style: style ? [gs, style] : gs };
}
