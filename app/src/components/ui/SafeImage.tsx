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

/**
 * Image wrapper dengan graceful fallback kalau:
 * - source URL null / undefined / empty string
 * - load gagal (network error, 404, BE strip URL untuk guest)
 *
 * Render placeholder neutral box dengan icon ImageOff. Aligned dengan
 * existing pattern di app — banyak BE field nullable (heroImageUrl,
 * qrisImageUrl, fotoUrl) yang sebelumnya cause "image kosong tanpa hint".
 */
type Props = Omit<ImageProps, 'source'> & {
  /** URI string, atau null/undefined → fallback placeholder */
  uri?: string | null;
  /** Container style — apply ke wrapper. style prop apply ke Image. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Bg color placeholder, default neutral-100 */
  placeholderBg?: string;
};

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

  return (
    <Image
      {...rest}
      source={{ uri: uri! } as ImageSourcePropType}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
