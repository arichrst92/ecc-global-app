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
import { Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HandHeart } from 'lucide-react-native';

export function BebasWebRedirect({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const url = `https://eccchurch.global/event/${encodeURIComponent(eventId)}/pembayaran`;

  useEffect(() => {
    Linking.openURL(url).catch(() => {
      // Silent — user can manually tap button below
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="px-4 py-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <ArrowLeft size={20} color="#171717" />
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
          onPress={() => Linking.openURL(url).catch(() => {})}
          className="bg-brand-500 rounded-2xl px-6 py-3.5"
        >
          <Text className="text-white font-bold text-sm">
            {t('event.bebas_web_open')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
