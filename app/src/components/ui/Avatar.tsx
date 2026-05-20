import { Image, Text, View } from 'react-native';
import { env } from '@/config/env';

type Props = {
  name: string;
  fotoUrl?: string | null;
  size?: number;
  className?: string; // bg color override
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Avatar dengan initials fallback kalau fotoUrl null/error.
 * fotoUrl bisa relative ("/uploads/profiles/jemaat/...") atau full URL.
 */
export function Avatar({ name, fotoUrl, size = 40, className }: Props) {
  const url = fotoUrl?.startsWith('http') ? fotoUrl : fotoUrl ? `${env.apiBaseUrl}${fotoUrl}` : null;
  const fontSize = Math.round(size / 2.5);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        className={`rounded-full ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <View
      className={`rounded-full items-center justify-center ${className ?? 'bg-brand-100'}`}
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-brand-700" style={{ fontSize }}>
        {initials(name)}
      </Text>
    </View>
  );
}
