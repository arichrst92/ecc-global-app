/**
 * Sink route untuk redirect `ecc://payment-done`.
 *
 * Web payment page (eccchurch.global/event/:id/pembayaran) navigate ke scheme
 * ini lewat tombol "Kembali ke Els App". WebBrowser.openAuthSessionAsync
 * menangkap redirect & menutup browser. Di Android, intent yang sama juga bisa
 * diteruskan ke expo-router — tanpa route ini user akan lihat "Unmatched Route".
 *
 * Screen ini langsung kembali ke screen sebelumnya (payment screen native).
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/utils/nav';
import { isDark } from '@/theme/ThemeRoot';

export default function PaymentDoneSink() {
  const router = useRouter();

  useEffect(() => {
    goBack(router, '/');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: isDark() ? '#0F0F10' : '#fff' }} />;
}
