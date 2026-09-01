import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Redirect route untuk Universal Link `https://eccchurch.global/renungan/:slug`.
 * Web menggunakan `/renungan/:slug` structure (shorter), mobile pakai
 * `/content/renungan/:slug` — redirect di sini supaya deep link ke web URL
 * langsung buka detail renungan di app.
 */
export default function RenunganDeepLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/content/renungan/${id}` as never);
    } else {
      router.replace('/content?tab=renungan' as never);
    }
  }, [id, router]);

  return <View className="flex-1 bg-neutral-50" />;
}
