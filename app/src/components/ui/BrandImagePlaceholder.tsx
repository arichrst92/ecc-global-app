/**
 * Gambar default saat konten tidak punya gambar (Group, Local Market, Event,
 * Renungan, News): gradient oranye brand memenuhi seluruh frame, watermark
 * logo ECC Church putih (opacity 40%) di sisi kanan, + logo Els App di tengah.
 */
import { Image, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { brandGradient } from '@/theme/gradient';

const LOGO = require('../../../assets/images/els-empty.png');
/** Logo ECC Church putih — watermark latar (opacity 40%). */
const WATERMARK = require('../../../assets/images/ecc-watermark-white.png');
const WATERMARK_ASPECT = 356 / 480;

export function BrandImagePlaceholder({
  logoSize = 56,
  className,
  style,
}: {
  /** Lebar logo (px). */
  logoSize?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const size = Math.max(20, Math.round(logoSize));
  return (
    <View className={`items-center justify-center bg-brand-500 overflow-hidden ${className ?? ''}`} style={[brandGradient(), style]}>
      {/* Watermark ECC Church — besar, terpotong di kanan supaya tidak bertumpuk dengan logo tengah */}
      <Image
        source={WATERMARK}
        resizeMode="contain"
        style={{
          position: 'absolute',
          right: '-6%',
          top: '-12%',
          height: '124%',
          aspectRatio: WATERMARK_ASPECT,
          opacity: 0.4,
        }}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <Image
        source={LOGO}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
          borderWidth: size >= 40 ? 2 : 1,
          borderColor: 'rgba(255,255,255,0.6)',
        }}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
}
