/**
 * Sink route untuk `ecc://giving-done` — tombol "Kembali ke Els App" di
 * halaman persembahan web. Android: tutup Custom Tab bila masih terbuka,
 * lalu kembali ke layar sebelumnya (beranda kalau tidak ada riwayat).
 */
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { goBack } from '@/utils/nav';
import { isDark } from '@/theme/ThemeRoot';

export default function GivingDoneSink() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Tidak ada browser terbuka → abaikan.
      Promise.resolve()
        .then(() => WebBrowser.dismissBrowser())
        .catch(() => {});
    }
    goBack(router, '/');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: isDark() ? '#0F0F10' : '#fff' }} />;
}
