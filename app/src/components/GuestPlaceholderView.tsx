import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Reusable placeholder UI untuk tab yang butuh auth (Ibadah, Event,
 * Persembahan). Render:
 * - Header brand orange dengan title tab
 * - Centered icon + value prop
 * - CTA "Daftar Akun" → exit guest + welcome
 *
 * Saat BE rilis /public/{ibadah,event,local-market,rekening} endpoint,
 * placeholder ini bisa di-replace dengan view read-only yang fetch dari sana.
 */
type Props = {
  /** Lucide icon component class — pass to render at hero */
  icon: React.ReactNode;
  /** Tab title — i18n key sudah di-resolve */
  title: string;
  /** Brief deskripsi value-prop */
  description: string;
  /** Optional: short label "Mengapa perlu daftar?" untuk readonly future */
  readOnlyHint?: string;
};

export function GuestPlaceholderView({ icon, title, description, readOnlyHint }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);

  async function goToWelcome() {
    await exitGuestMode();
    router.replace('/(auth)/welcome');
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-lg font-bold">{title}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 32,
          alignItems: 'center',
        }}
      >
        <View className="w-24 h-24 rounded-full bg-brand-50 items-center justify-center mb-6">
          {icon}
        </View>

        <Text className="text-xl font-bold text-neutral-900 text-center mb-3">
          {t('guest.placeholder_title')}
        </Text>
        <Text className="text-sm text-neutral-600 text-center leading-relaxed mb-4">
          {description}
        </Text>

        {readOnlyHint ? (
          <View className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6 w-full">
            <Text className="text-xs text-amber-800 text-center leading-relaxed">
              {readOnlyHint}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={goToWelcome}
          className="bg-brand-500 py-4 px-8 rounded-2xl flex-row items-center gap-2 w-full justify-center"
        >
          <UserPlus size={20} color="#fff" />
          <Text className="text-white font-bold text-base">
            {t('guest.cta_signup')}
          </Text>
        </Pressable>

        <Text className="text-xs text-neutral-400 text-center mt-4">
          {t('guest.profile_login_hint')}
        </Text>
      </ScrollView>
    </View>
  );
}
