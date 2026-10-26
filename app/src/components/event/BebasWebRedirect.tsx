/**
 * BebasWebRedirect — reusable gate untuk in-app screen yang handle
 * NOMINAL_BEBAS (donasi sukarela). Auto-open web browser + show placeholder
 * dengan manual open button.
 *
 * Per Apple Guideline 3.2.2(iv) — charitable donation harus di-external
 * untuk non-Benevity/Candid nonprofits. Screens ini legacy dari v1.6.0,
 * gate ini prevent Apple flag saat reviewer explore via deeplink.
 */
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HandHeart } from 'lucide-react-native';

import { openEventPaymentWeb } from '@/utils/eventPaymentWeb';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export function BebasWebRedirect({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Opsi A — daftar + upload bukti BEBAS di web dengan web action token
  // (lihat src/utils/eventPaymentWeb.ts). Setelah browser tertutup → refresh
  // status event + tracker keluarga supaya pendaftaran dari web terlihat.
  async function openWeb() {
    await openEventPaymentWeb(eventId);
    await queryClient.invalidateQueries({ queryKey: ['event', 'detail'] });
    await queryClient.invalidateQueries({ queryKey: ['event', 'mine-and-family', eventId] });
  }

  useEffect(() => {
    void openWeb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <View className="px-4 py-2">
        <Pressable
          onPress={() => goBack(router)}
          className="w-10 h-10 items-center justify-center"
        >
          <ArrowLeft size={20} color={nc('#171717')} />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-3xl bg-brand-50 items-center justify-center mb-6">
          <HandHeart size={40} color="#EA580C" />
        </View>
        <Text className="text-xl font-bold text-neutral-900 text-center mb-2">
          {t('event.bebas_web_title')}
        </Text>
        <Text className="text-sm text-neutral-600 text-center mb-8 leading-relaxed">
          {t('event.bebas_web_body')}
        </Text>
        <Pressable
          onPress={() => void openWeb()}
          {...gx('bg-brand-500 rounded-2xl px-6 py-3.5')}
        >
          <Text className="text-white font-bold text-sm">
            {t('event.bebas_web_open')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
