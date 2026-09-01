import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Redirect route untuk Universal Link `https://eccchurch.global/news/:slug`.
 * Web menggunakan `/news/:slug` structure (shorter), mobile pakai
 * `/content/news/:slug` — redirect di sini supaya deep link ke web URL
 * langsung buka detail berita di app.
 */
export default function NewsDeepLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/content/news/${id}` as never);
    } else {
      router.replace('/content?tab=news' as never);
    }
  }, [id, router]);

  return <View className="flex-1 bg-neutral-50" />;
}
