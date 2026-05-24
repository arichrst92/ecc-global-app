import { useState } from 'react';
import {
  Image,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ImageOff } from 'lucide-react-native';

import { env } from '@/config/env';

/**
 * Image wrapper dengan graceful fallback kalau:
 * - source URL null / undefined / empty string
 * - load gagal (network error, 404, BE strip URL untuk guest)
 *
 * Auto-prepend base API URL kalau path relative (starts with "/") — BE
 * kadang return absolute URL, kadang relative path. Defensive untuk both.
 *
 * Render placeholder neutral box dengan icon ImageOff kalau gagal.
 */
type Props = Omit<ImageProps, 'source'> & {
  /** URI string, atau null/undefined → fallback placeholder. Bisa absolute
   *  (https://...) atau relative (/uploads/...). */
  uri?: string | null;
  /** Container style — apply ke wrapper. style prop apply ke Image. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Bg color placeholder, default neutral-100 */
  placeholderBg?: string;
};

/** Normalize URI: relative path → absolute dengan base URL. */
function normalizeUri(uri: string): string {
  const trimmed = uri.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Relative path — prepend base URL
  const base = env.apiBaseUrl.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function SafeImage({ uri, containerStyle, placeholderBg = '#F5F5F5', style, ...rest }: Props) {
  const [failed, setFailed] = useState(false);

  const hasUri = !!uri && uri.trim().length > 0;
  const shouldShowPlaceholder = !hasUri || failed;

  if (shouldShowPlaceholder) {
    return (
      <View
        style={[
          { backgroundColor: placeholderBg, alignItems: 'center', justifyContent: 'center' },
          containerStyle,
          style as object,
        ]}
      >
        <ImageOff size={32} color="#A3A3A3" />
      </View>
    );
  }

  const fullUri = normalizeUri(uri!);

  return (
    <Image
      {...rest}
      source={{ uri: fullUri } as ImageSourcePropType}
      style={style}
      onLoad={() => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[SafeImage] loaded:', fullUri);
        }
      }}
      onError={(e) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[SafeImage] load FAILED:', {
            originalUri: uri,
            resolvedUri: fullUri,
            error: e.nativeEvent,
          });
        }
        setFailed(true);
      }}
    />
  );
}
