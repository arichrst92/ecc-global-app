/**
 * Logo IDEA (teks hitam, latar transparan). Di mode gelap logo tidak terlihat,
 * jadi dibungkus kapsul putih. Mode terang: tampil apa adanya.
 */
import { Image, View } from 'react-native';

import { isDark } from '@/theme/ThemeRoot';

const LOGO = require('../../assets/images/logo-idea.webp');

export function IdeaLogo({ width, height, boxed }: { width: number; height: number; boxed?: boolean }) {
  const img = <Image source={LOGO} style={{ width, height }} resizeMode="contain" accessibilityLabel="IDEA" />;
  // `boxed`: pemanggil sudah punya kotak sendiri (mis. ikon di daftar) → cukup warnai putih di mode gelap.
  if (!isDark()) return img;
  const padX = Math.max(6, Math.round(height * 0.45));
  const padY = Math.max(3, Math.round(height * 0.25));
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: boxed ? 8 : 999,
        paddingHorizontal: boxed ? 4 : padX,
        paddingVertical: boxed ? 4 : padY,
      }}
    >
      {img}
    </View>
  );
}
