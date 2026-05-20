import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, Church, Clock, MapPin, QrCode, ChevronRight, BookOpen, Newspaper, CalendarDays } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BranchChip } from '@/components/branch/BranchChip';
import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { useAuthStore } from '@/stores/auth.store';
import { useMyStats, useTodayServices, useLatestRenungan, useLatestNews } from '@/hooks/useHomeData';
import { useHomeEvents } from '@/hooks/useHomeEvents';
import { formatDate } from '@/utils/date';

function formatTime(hhmm: string): string {
  return hhmm; // BE return "08:00" — display apa adanya
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const statsQuery = useMyStats();
  const todayQuery = useTodayServices();
  const renunganQuery = useLatestRenungan();
  const newsQuery = useLatestNews();
  const eventsQuery = useHomeEvents();
  const lang = i18n.language;

  const isRefreshing =
    statsQuery.isRefetching ||
    todayQuery.isRefetching ||
    renunganQuery.isRefetching ||
    newsQuery.isRefetching ||
    eventsQuery.isRefetching;

  function refresh() {
    statsQuery.refetch();
    todayQuery.refetch();
    renunganQuery.refetch();
    newsQuery.refetch();
    eventsQuery.refetch();
  }

  if (!user) return null;

  const todayService = todayQuery.data?.[0] ?? null;
  const streak = statsQuery.data?.streakWeeks ?? 0;
  const renungan = renunganQuery.data;
  const news = newsQuery.data ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Persistent viewing banner kalau != home */}
        <ViewingBanner />

        {/* Header gradient */}
        <View className="bg-brand-500 pb-12 rounded-b-3xl">
          <SafeAreaView edges={['top']}>
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
              <View className="flex-row items-center gap-3 flex-1">
                <Avatar
                  name={user.namaLengkap}
                  fotoUrl={user.fotoUrl}
                  size={44}
                  className="bg-white/20"
                />
                <View className="flex-1">
                  <Text className="text-white/80 text-xs">{t('home.greeting')}</Text>
                  <Text className="text-white font-semibold" numberOfLines={1}>
                    {user.namaLengkap.split(' ')[0]}
                  </Text>
                </View>
              </View>
              <Pressable className="bg-white/15 rounded-full p-2">
                <Bell size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Streak banner */}
            {streak > 0 ? (
              <View className="mx-5 mt-1 bg-white/10 rounded-2xl p-3 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-amber-300 items-center justify-center">
                  <Text className="text-lg">🔥</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white/80 text-xs">{t('home.streak_label')}</Text>
                  <Text className="text-white font-semibold">
                    {t('home.streak_weeks', { count: streak })}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Branch context chip — tap untuk switch view */}
            <View className="mx-5 mt-2">
              <BranchChip variant="header" onPress={() => setSwitcherOpen(true)} />
            </View>
          </SafeAreaView>
        </View>

        {/* Today's Service */}
        <View className="px-5 -mt-6">
          {todayService ? (
            <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
              <View className="p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    {t('home.today_service')}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-neutral-900">{todayService.nama}</Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Clock size={14} color="#737373" />
                  <Text className="text-sm text-neutral-500">
                    {formatTime(todayService.jamMulai)} - {formatTime(todayService.jamSelesai)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 mt-1">
                  <MapPin size={14} color="#737373" />
                  <Text className="text-sm text-neutral-500 flex-1" numberOfLines={1}>
                    {todayService.lokasi}
                  </Text>
                </View>
              </View>
              <View className="flex-row border-t border-neutral-100">
                <Pressable
                  className="flex-1 py-3 flex-row items-center justify-center gap-2"
                  onPress={() => router.push(`/ibadah/${todayService.ibadahId}`)}
                >
                  <Church size={16} color="#525252" />
                  <Text className="text-sm font-medium text-neutral-700">{t('home.detail')}</Text>
                </Pressable>
                <View className="w-px bg-neutral-100" />
                <Pressable
                  className="flex-1 py-3 flex-row items-center justify-center gap-2"
                  onPress={() => router.push('/qr-card')}
                >
                  <QrCode size={16} color="#EA580C" />
                  <Text className="text-sm font-semibold text-brand-600">{t('home.show_qr')}</Text>
                </Pressable>
              </View>
            </View>
          ) : todayQuery.isPending ? (
            <SkeletonCard height={120} />
          ) : (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 items-center">
              <Church size={28} color="#A3A3A3" />
              <Text className="text-sm text-neutral-500 mt-2">{t('home.no_service_today')}</Text>
            </View>
          )}
        </View>

        {/* Renungan today */}
        <Section
          title={t('home.today_devotional')}
          onSeeAll={() => router.push('/(tabs)/event' /* TODO: news-list with renungan tab di M4 */)}
        >
          {renungan ? (
            <Pressable
              className="bg-white rounded-2xl overflow-hidden border border-neutral-100"
              onPress={() => router.push('/(tabs)/event' /* TODO M4: navigate ke renungan detail */)}
            >
              <View
                className="h-24 bg-gradient-to-br from-amber-200 to-orange-200 items-end justify-end p-3"
                style={{ backgroundColor: '#FED7AA' }}
              >
                <Text style={{ fontSize: 36 }}>📖</Text>
              </View>
              <View className="p-3.5">
                <Text className="text-xs text-brand-600 font-semibold">
                  {renungan.ayatAlkitab} · {t('home.today_service').split(' ')[1] /* "Hari ini"/"today" approx */}
                </Text>
                <Text className="font-bold text-neutral-900 mt-1" numberOfLines={1}>
                  {renungan.judul}
                </Text>
                <Text className="text-sm text-neutral-500 mt-1" numberOfLines={2}>
                  {renungan.ringkasan}
                </Text>
              </View>
            </Pressable>
          ) : renunganQuery.isPending ? (
            <SkeletonCard height={140} />
          ) : null}
        </Section>

        {/* Upcoming Events */}
        <Section
          title={t('home.upcoming_events')}
          onSeeAll={() => router.push('/(tabs)/event')}
        >
          {eventsQuery.isPending ? (
            <SkeletonCard height={140} />
          ) : (eventsQuery.data?.length ?? 0) === 0 ? null : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 5 }}
            >
              {(eventsQuery.data ?? []).map((e) => {
                const isFree = e.tipeBayar === 'GRATIS';
                const priceText = isFree
                  ? t('event.free')
                  : `Rp ${(Number(e.nominal) / 1000).toLocaleString('id-ID')}rb`;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push(`/event/${e.slug || e.id}`)}
                    className="w-56 bg-white rounded-2xl overflow-hidden border border-neutral-100"
                  >
                    <View className="h-24 bg-brand-300 items-center justify-center">
                      <Text style={{ fontSize: 40 }}>🎉</Text>
                    </View>
                    <View className="p-3">
                      <Text className="text-[10px] text-neutral-500 mb-1" numberOfLines={1}>
                        {formatDate(e.tanggalMulai, lang)}
                      </Text>
                      <Text className="font-semibold text-sm text-neutral-900" numberOfLines={2}>
                        {e.judul}
                      </Text>
                      <Text
                        className={`text-xs font-semibold mt-1 ${isFree ? 'text-emerald-600' : 'text-amber-600'}`}
                      >
                        {priceText}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Section>

        {/* Latest News */}
        <Section
          title={t('home.latest_news')}
          onSeeAll={() => router.push('/(tabs)/event' /* TODO M4 */)}
        >
          {newsQuery.isPending ? (
            <SkeletonCard height={80} />
          ) : news.length === 0 ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 items-center">
              <Newspaper size={24} color="#A3A3A3" />
              <Text className="text-sm text-neutral-500 mt-2">Belum ada berita</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {news.map((n) => (
                <Pressable
                  key={n.id}
                  className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
                  onPress={() => router.push('/(tabs)/event' /* TODO M4 */)}
                >
                  <View
                    className="w-14 h-14 rounded-xl items-center justify-center"
                    style={{ backgroundColor: '#F5F5F5' }}
                  >
                    {n.heroImageUrl ? (
                      // Placeholder icon untuk MVP — proper image M4
                      <BookOpen size={22} color="#737373" />
                    ) : (
                      <Newspaper size={22} color="#737373" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-sm text-neutral-900" numberOfLines={1}>
                      {n.judul}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
                      {n.ringkasan}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>

      <BranchSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

function Section({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View className="px-5 mt-5">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="font-bold text-neutral-900">{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} className="flex-row items-center gap-0.5">
            <Text className="text-xs text-brand-600 font-semibold">{t('home.see_all')}</Text>
            <ChevronRight size={14} color="#EA580C" />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <View
      className="bg-neutral-100 rounded-2xl"
      style={{ height }}
    />
  );
}
