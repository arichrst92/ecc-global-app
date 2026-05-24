import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Globe, Heart, MapPin } from 'lucide-react-native';

import { GuestModeBanner } from '@/components/GuestModeBanner';

/**
 * Home tab UI khusus guest mode — simplified, static content saja.
 *
 * Tidak fetch /admin/news atau /admin/renungan karena butuh auth (guest
 * tidak punya JWT). V2: kalau BE rilis /public/news + /public/renungan
 * (per docs/backend-request-public-content-for-guest.md), bisa enable di sini.
 *
 * Yang ditampil:
 * - Welcome banner ECC
 * - GuestModeBanner CTA daftar (prominent)
 * - About ECC brief
 * - Link ke website public
 */
export function GuestHomeView() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      {/* Hero brand header */}
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-8 items-center">
            <Image
              source={require('../../assets/images/ecc-icon-circle.png')}
              style={{ width: 64, height: 64 }}
              resizeMode="contain"
            />
            <Text className="text-white text-xl font-bold mt-3">ECC Global App</Text>
            <Text className="text-white/80 text-xs mt-1 text-center px-6">
              {t('guest.home_tagline')}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <GuestModeBanner />

        {/* About ECC */}
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 mt-2">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-8 h-8 rounded-xl bg-brand-50 items-center justify-center">
              <Heart size={16} color="#EA580C" />
            </View>
            <Text className="text-sm font-bold text-neutral-900">
              {t('guest.about_title')}
            </Text>
          </View>
          <Text className="text-sm text-neutral-700 leading-relaxed">
            {t('guest.about_body')}
          </Text>
        </View>

        {/* Links */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-5 mb-2">
          {t('guest.links_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <Pressable
            onPress={() => Linking.openURL('https://eccchurch.global')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Globe size={18} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">Website</Text>
              <Text className="text-xs text-neutral-500">eccchurch.global</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://eccchurch.global/locations')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
              <MapPin size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">
                {t('guest.find_branch')}
              </Text>
              <Text className="text-xs text-neutral-500">
                {t('guest.find_branch_sub')}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
