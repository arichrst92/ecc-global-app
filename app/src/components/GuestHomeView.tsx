import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Globe,
  Heart,
  MapPin,
  Newspaper,
  Sparkles,
} from 'lucide-react-native';

import { GuestModeBanner } from '@/components/GuestModeBanner';
import { SafeImage } from '@/components/ui/SafeImage';
import { usePublicEvents, usePublicNews, usePublicRenungan } from '@/hooks/usePublicGuest';
import { formatDate } from '@/utils/date';

/**
 * Home tab UI khusus guest mode.
 *
 * Per BE handoff 2026-05-24 — sekarang fetch:
 * - 3 latest upcoming events (/public/event)
 * - 3 latest news (/public/news)
 * - 1 latest renungan as 'Renungan Hari Ini' (/public/renungan)
 */
export function GuestHomeView() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const eventsQuery = usePublicEvents(null);
  const newsQuery = usePublicNews({ limit: 3 });
  const renunganQuery = usePublicRenungan({ limit: 1 });
  const upcomingEvents = (eventsQuery.data?.data ?? []).slice(0, 3);
  const latestNews = newsQuery.data?.data ?? [];
  const latestRenungan = renunganQuery.data?.data[0];

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
            <Text className="text-white text-xl font-bold mt-3">Els App</Text>
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

        {/* Renungan Hari Ini */}
        {latestRenungan ? (
          <Pressable
            onPress={() => router.push(`/renungan/${latestRenungan.slug}` as never)}
            className="bg-white rounded-2xl p-4 border border-neutral-100 mt-3"
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                <Sparkles size={16} color="#D97706" />
              </View>
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex-1">
                {t('home.today_devotional')}
              </Text>
              <ChevronRight size={14} color="#A3A3A3" />
            </View>
            <Text className="text-base font-bold text-neutral-900" numberOfLines={2}>
              {latestRenungan.judul}
            </Text>
            {latestRenungan.ayatAlkitab ? (
              <Text className="text-xs text-brand-600 font-semibold mt-1">
                {latestRenungan.ayatAlkitab}
              </Text>
            ) : null}
            {latestRenungan.ringkasan ? (
              <Text className="text-sm text-neutral-600 mt-2 leading-relaxed" numberOfLines={3}>
                {latestRenungan.ringkasan}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* News preview */}
        {latestNews.length > 0 ? (
          <>
            <View className="flex-row items-center justify-between mt-5 mb-2">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {t('home.latest_news')}
              </Text>
              <Pressable
                onPress={() => router.push('/news' as never)}
                className="flex-row items-center gap-0.5"
              >
                <Text className="text-xs text-brand-600 font-semibold">{t('home.see_all')}</Text>
                <ChevronRight size={12} color="#EA580C" />
              </Pressable>
            </View>
            <View className="gap-2">
              {latestNews.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => router.push(`/news/${n.slug}` as never)}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden flex-row"
                >
                  <SafeImage
                    uri={n.heroImageUrl}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                  />
                  <View className="flex-1 p-3 justify-center">
                    <Text
                      className="text-sm font-semibold text-neutral-900"
                      numberOfLines={2}
                    >
                      {n.judul}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Newspaper size={11} color="#737373" />
                      <Text className="text-[11px] text-neutral-500">
                        {formatDate(n.tanggal, i18n.language)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* Upcoming events preview */}
        {upcomingEvents.length > 0 ? (
          <>
            <View className="flex-row items-center justify-between mt-5 mb-2">
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {t('home.upcoming_events')}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/event' as never)}
                className="flex-row items-center gap-0.5"
              >
                <Text className="text-xs text-brand-600 font-semibold">
                  {t('home.see_all')}
                </Text>
                <ChevronRight size={12} color="#EA580C" />
              </Pressable>
            </View>
            <View className="gap-2">
              {upcomingEvents.map((ev) => (
                <View
                  key={ev.id}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden flex-row"
                >
                  <SafeImage
                    uri={ev.heroImageUrl}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                  />
                  <View className="flex-1 p-3 justify-center">
                    <Text
                      className="text-sm font-semibold text-neutral-900"
                      numberOfLines={2}
                    >
                      {ev.judul}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <CalendarDays size={11} color="#737373" />
                      <Text className="text-[11px] text-neutral-500">
                        {formatDate(ev.tanggalMulai, i18n.language)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Links */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-5 mb-2">
          {t('guest.links_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <Pressable
            onPress={() => router.push('/bible' as never)}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <BookOpen size={18} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">
                {t('guest.nav_bible')}
              </Text>
              <Text className="text-xs text-neutral-500">{t('guest.nav_bible_sub')}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/branch-list' as never)}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
              <MapPin size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">
                {t('guest.nav_branch')}
              </Text>
              <Text className="text-xs text-neutral-500">
                {t('guest.nav_branch_sub')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://eccchurch.global')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center">
              <Globe size={18} color="#737373" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">Website</Text>
              <Text className="text-xs text-neutral-500">eccchurch.global</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
