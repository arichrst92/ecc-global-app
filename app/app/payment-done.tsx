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

export default function PaymentDoneSink() {
  const router = useRouter();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}
