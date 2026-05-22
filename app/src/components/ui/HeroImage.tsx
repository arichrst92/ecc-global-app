import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { env } from '@/config/env';

type Props = {
  /** Path relatif dari BE (mis. /uploads/...) atau URL absolute */
  url?: string | null;
  /** Emoji fallback kalau tidak ada gambar */
  fallbackEmoji?: string;
  /** Tailwind class untuk container */
  className?: string;
  /** Inline style override */
  style?: StyleProp<ViewStyle>;
  /** Ukuran emoji fallback (default 64) */
  emojiSize?: number;
  /**
   * Mode "fit to width" — image diukur natural aspect ratio-nya,
   * lalu container otomatis ambil tinggi proporsional sesuai width.
   * Saat dimensi belum ter-fetch, pakai `fallbackAspect` (default 16:9)
   * supaya tidak layout shift parah.
   */
  fitToWidth?: boolean;
  /** Default aspect ratio (width/height) saat dimensi natural belum ter-load */
  fallbackAspect?: number;
};

/**
 * Hero image dengan auto URL resolution (relative → absolute) dan emoji fallback.
 *
 * BE return image URL sebagai path relatif (`/uploads/content/...`). Komponen ini
 * auto-prepend `env.apiBaseUrl`. Kalau URL absolute (http/https), pakai apa adanya.
 *
 * Kalau image gagal load (404, network error) atau URL null/empty → tampil emoji fallback.
 *
 * Untuk image yang harus fit-to-width dengan height proporsional (mis. poster
 * di dashboard), pakai `fitToWidth` — komponen akan call `Image.getSize` lalu
 * set `aspectRatio` di container.
 */
export function HeroImage({
  url,
  fallbackEmoji = '🎉',
  className,
  style,
  emojiSize = 64,
  fitToWidth = false,
  fallbackAspect = 16 / 9,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  const resolvedUrl = (() => {
    if (!url || failed) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${env.apiBaseUrl}${url}`;
    return `${env.apiBaseUrl}/${url}`;
  })();

  // Fetch natural dimensions kalau fitToWidth aktif
  useEffect(() => {
    if (!resolvedUrl || !fitToWidth) {
      setNaturalAspect(null);
      return;
    }
    let cancelled = false;
    Image.getSize(
      resolvedUrl,
      (w, h) => {
        if (!cancelled && h > 0) setNaturalAspect(w / h);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, fitToWidth]);

  if (resolvedUrl) {
    // Fit-to-width: container ambil aspectRatio sesuai image natural,
    // image render full size (width 100% + auto height via aspectRatio).
    if (fitToWidth) {
      const aspect = naturalAspect ?? fallbackAspect;
      return (
        <View
          className={className}
          style={[style, { width: '100%', aspectRatio: aspect }]}
        >
          <Image
            source={{ uri: resolvedUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </View>
      );
    }
    return (
      <View className={className} style={style}>
        <Image
          source={{ uri: resolvedUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // Fallback — emoji centered. Untuk fitToWidth pakai fallbackAspect biar
  // layout konsisten (gak tiba-tiba kosong / collapse).
  return (
    <View
      className={`${className ?? ''} items-center justify-center bg-brand-300`}
      style={[
        style,
        fitToWidth ? { width: '100%', aspectRatio: fallbackAspect } : null,
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{fallbackEmoji}</Text>
    </View>
  );
}
