import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  HandHeart,
  Calendar,
  Church,
  MessageCircleMore,
  UserPlus,
} from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Profile tab UI khusus untuk guest mode.
 *
 * Replace full ProfileTab rendering — tidak ada avatar, family, scanner,
 * settings, dll. Hanya CTA daftar/login + value prop ringkas.
 */
export function GuestProfileView() {
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

      {/* Header — branded orange seperti profile tab biasa, tapi tanpa user data */}
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-8 items-center">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
              <Eye size={40} color="#fff" />
            </View>
            <Text className="text-white text-xl font-bold">
              {t('guest.profile_title')}
            </Text>
            <Text className="text-white/80 text-sm mt-1 text-center">
              {t('guest.profile_login_hint')}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
      >
        {/* Brand banner */}
        <View className="bg-white rounded-2xl p-5 items-center border border-neutral-100">
          <Image
            source={require('../../assets/images/ecc-icon-circle.png')}
            style={{ width: 72, height: 72 }}
            resizeMode="contain"
          />
          <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
            ECC Global App
          </Text>
          <Text className="text-sm text-neutral-500 mt-1 text-center leading-relaxed">
            {t('guest.profile_body')}
          </Text>
        </View>

        {/* Value prop — features yang user dapat setelah daftar */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-6 mb-2">
          {t('guest.unlock_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <Feature icon={<Church size={20} color="#EA580C" />} label={t('guest.feature_ibadah')} />
          <Feature icon={<HandHeart size={20} color="#059669" />} label={t('guest.feature_giving')} />
          <Feature icon={<Calendar size={20} color="#2563EB" />} label={t('guest.feature_event')} />
          <Feature
            icon={<MessageCircleMore size={20} color="#D97706" />}
            label={t('guest.feature_face_login')}
          />
        </View>

        {/* CTA */}
        <Pressable
          onPress={goToWelcome}
          className="mt-6 bg-brand-500 py-4 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <UserPlus size={20} color="#fff" />
          <Text className="text-white font-bold text-base">
            {t('guest.cta_signup')}
          </Text>
        </Pressable>

        <Text className="text-xs text-neutral-400 text-center mt-3">
          {t('guest.profile_login_hint')}
        </Text>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="p-4 flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center">
        {icon}
      </View>
      <Text className="text-sm text-neutral-800 flex-1">{label}</Text>
    </View>
  );
}
