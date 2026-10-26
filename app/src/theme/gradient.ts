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

export const BRAND_GRADIENT = 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)';

export const brandGradientStyle: ViewStyle = (
  Platform.OS === 'web' ? { backgroundImage: BRAND_GRADIENT } : { experimental_backgroundImage: BRAND_GRADIENT }
) as ViewStyle;

const HAS_BRAND_BG = /(^|\s)bg-brand-(500|600)(\s|$)/;

/** className + style dengan gradient brand bila className memuat bg-brand-500/600. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gx(className: string | false | null | undefined, style?: any): { className?: string; style?: any } {
  const cls = className || undefined;
  if (!cls || !HAS_BRAND_BG.test(cls)) return { className: cls, style };
  if (typeof style === 'function') {
    // Pressable: style={({ pressed }) => ...}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { className: cls, style: (state: any) => [brandGradientStyle, style(state)] };
  }
  return { className: cls, style: style ? [brandGradientStyle, style] : brandGradientStyle };
}
