import { useState } from 'react';
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
};

/**
 * Hero image dengan auto URL resolution (relative → absolute) dan emoji fallback.
 *
 * BE return image URL sebagai path relatif (`/uploads/content/...`). Komponen ini
 * auto-prepend `env.apiBaseUrl`. Kalau URL absolute (http/https), pakai apa adanya.
 *
 * Kalau image gagal load (404, network error) atau URL null/empty → tampil emoji fallback.
 */
export function HeroImage({
  url,
  fallbackEmoji = '🎉',
  className,
  style,
  emojiSize = 64,
}: Props) {
  const [failed, setFailed] = useState(false);

  const resolvedUrl = (() => {
    if (!url || failed) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${env.apiBaseUrl}${url}`;
    return `${env.apiBaseUrl}/${url}`;
  })();

  if (resolvedUrl) {
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

  // Fallback — emoji centered
  return (
    <View
      className={`${className ?? ''} items-center justify-center bg-brand-300`}
      style={style}
    >
      <Text style={{ fontSize: emojiSize }}>{fallbackEmoji}</Text>
    </View>
  );
}
