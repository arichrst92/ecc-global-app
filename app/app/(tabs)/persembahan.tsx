import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { HandHeart } from 'lucide-react-native';

import { useViewingBranch } from '@/hooks/useViewingBranch';
import { buildGivingUrl, openGiving } from '@/utils/giving';
import { gx } from '@/theme/gradient';

/**
 * Persembahan tab — konsisten iOS + Android: redirect ke web page untuk
 * charitable donations (Apple Guideline 3.2.2(iv) compliance + konsistensi
 * cross-platform).
 *
 * Bottom-nav tab sudah hidden (per _layout.tsx href: null), screen ini
 * defensive-only untuk deeplink `ecc://persembahan`.
 */
export default function PersembahanTab() {
  return <PersembahanWebRedirect />;
}

/**
 * Screen fallback kalau user reach via deeplink — tampilkan info + tombol
 * "Buka di Browser" + auto-open browser on mount.
 */
function PersembahanWebRedirect() {
  const { t } = useTranslation();
  // Pakai viewing branch supaya web page langsung tampil rekening cabang tsb.
  const { branch } = useViewingBranch();
  const url = buildGivingUrl(branch?.kode);

  useEffect(() => {
    // Auto-open saat screen mount (iOS Safari / Android in-app browser)
    void openGiving(branch?.kode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-3xl bg-brand-50 items-center justify-center mb-6">
          <HandHeart size={40} color="#EA580C" />
        </View>
        <Text className="text-xl font-bold text-neutral-900 text-center mb-2">
          {t('persembahan.ios_title')}
        </Text>
        <Text className="text-sm text-neutral-600 text-center mb-8 leading-relaxed">
          {t('persembahan.ios_body')}
        </Text>
        <Pressable
          onPress={() => void openGiving(branch?.kode)}
          {...gx('bg-brand-500 rounded-2xl px-6 py-3.5 flex-row items-center gap-2')}
        >
          <Text className="text-white font-bold text-sm">
            {t('persembahan.ios_open_web')}
          </Text>
        </Pressable>
        <Text className="text-xs text-neutral-400 mt-4">{url}</Text>
      </View>
    </SafeAreaView>
  );
}
