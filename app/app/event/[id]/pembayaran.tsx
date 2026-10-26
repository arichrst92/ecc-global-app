/**
 * Sink route untuk link https://eccchurch.global/event/{id}/pembayaran yang
 * tertangkap App Link Android (mis. dari app versi lama atau link yang
 * dibagikan). Tanpa route ini muncul "Unmatched Route".
 *
 * Arahkan ke detail event — dari sana tombol bayar membuka halaman
 * pembayaran web di /bayar/event/{id} (tidak tertangkap App Link).
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { isDark } from '@/theme/ThemeRoot';

export default function EventPembayaranSink() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    // Tutup browser pembayaran yang mungkin masih terbuka (Android Custom Tab).
    Promise.resolve()
      .then(() => WebBrowser.dismissBrowser())
      .catch(() => {});
    router.replace(id ? (`/event/${id}` as never) : ('/' as never));
  }, [id, router]);

  return <View style={{ flex: 1, backgroundColor: isDark() ? '#0F0F10' : '#fff' }} />;
}
