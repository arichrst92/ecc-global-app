import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, Church, Clock, MapPin, QrCode, ChevronRight, Newspaper, CalendarDays, Video } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { BranchChip } from '@/components/branch/BranchChip';
import { GuestHomeView } from '@/components/GuestHomeView';
import { QuickAccess } from '@/components/home/QuickAccess';
import { useNotificationsStore } from '@/stores/notifications.store';
import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { useAuthStore } from '@/stores/auth.store';
import { useMyStats, useTodayServices, useLatestRenungan, useLatestNews } from '@/hooks/useHomeData';
import { useHomeEvents } from '@/hooks/useHomeEvents';
import { formatDate } from '@/utils/date';
import { getOnlineLink } from '@/utils/ibadahOnline';

function formatTime(hhmm: string): string {
  return hhmm; // BE return "08:00" — display apa adanya
}

export default function HomeScreen() {
  // Guard di luar — supaya rules-of-hooks tidak violated. Dengan branching di
  // top level component, each branch render component berbeda dengan hook set
  // yang konsisten internally.
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) {
    return <GuestHomeView />;
  }
  return <HomeScreenAuthenticated />;
}

function HomeScreenAuthenticated() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const statsQuery = useMyStats();
  const todayQuery = useTodayServices();
  const renunganQuery = useLatestRenungan();
  const newsQuery = useLatestNews();
  const eventsQuery = useHomeEvents();
  const unreadNotifs = useNotificationsStore((s) =>
    s.items.filter((n) => !n.read).length,
  );
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
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Persistent viewing banner kalau != home */}
        <ViewingBanner />

        {/* Header gradient */}
        <View className="bg-brand-500 pb-6 rounded-b-3xl">
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
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => router.push('/qr-card')}
                  className="bg-white/15 rounded-full p-2"
                  accessibilityLabel={t('home.show_qr')}
                >
                  <QrCode size={20} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/notifications')}
                  className="bg-white/15 rounded-full p-2"
                  accessibilityLabel={t('profile.notifications')}
                >
                  <Bell size={20} color="#fff" />
                  {unreadNotifs > 0 ? (
                    <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center border-2 border-brand-500">
                      <Text className="text-[10px] font-bold text-white">
                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
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

        {/* Quick Access — visible sesuai otoritas */}
        <QuickAccess />

        {/* Today's Service — hide section entirely kalau ga ada ibadah hari ini */}
        {todayQuery.isPending ? (
          <View className="px-5 mt-4">
            <SkeletonCard height={120} />
          </View>
        ) : todayService ? (
          <View className="px-5 mt-4">
            <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
              <View className="p-4">
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      {t('home.today_service')}
                    </Text>
                  </View>
                  {/* Kategori badge top-right */}
                  {todayService.kategoriIbadah ? (
                    <View className="bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5">
                      <Text className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                        {todayService.kategoriIbadah.nama}
                      </Text>
                    </View>
                  ) : null}
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

                {/* Akses Online button — only show kalau ibadah punya link.
                    BE confirmed 2026-05-24: field `linkOnline`. Helper
                    getOnlineLink normalize null/empty-string. */}
                {(() => {
                  const onlineLink = getOnlineLink(todayService);
                  if (!todayService.isOnline || !onlineLink) return null;
                  return (
                    <Pressable
                      onPress={() => Linking.openURL(onlineLink).catch(() => {})}
                      className="mt-3 bg-emerald-500 rounded-xl py-2.5 flex-row items-center justify-center gap-2"
                    >
                      <Video size={16} color="#fff" />
                      <Text className="text-white font-semibold text-sm">
                        {t('ibadah.access_online')}
                      </Text>
                    </Pressable>
                  );
                })()}
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
                {/* Show QR untuk attendance (always available). Kalau ibadah
                    online + ada link, additional row "Akses Online" akan
                    muncul di bawah (rendered separately). */}
                <Pressable
                  className="flex-1 py-3 flex-row items-center justify-center gap-2"
                  onPress={() => router.push('/qr-card')}
                >
                  <QrCode size={16} color="#EA580C" />
                  <Text className="text-sm font-semibold text-brand-600">{t('home.show_qr')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* Renungan today */}
        <Section
          title={t('home.today_devotional')}
          onSeeAll={() => router.push('/content?tab=renungan')}
        >
          {renungan ? (
            <Pressable
              className="bg-white rounded-2xl overflow-hidden border border-neutral-100"
              onPress={() => router.push(`/content/renungan/${renungan.slug || renungan.id}`)}
            >
              {/* Fit-to-width: tinggi proporsional sesuai aspect rasio asli image */}
              <HeroImage
                url={renungan.heroImageUrl}
                fallbackEmoji="📖"
                emojiSize={36}
                fitToWidth
              />
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

        {/* Upcoming Events — hide section entirely kalau ga ada event */}
        {eventsQuery.isPending ? (
          <Section title={t('home.upcoming_events')}>
            <SkeletonCard height={140} />
          </Section>
        ) : (eventsQuery.data?.length ?? 0) === 0 ? null : (
          <Section
            title={t('home.upcoming_events')}
            onSeeAll={() => router.push('/(tabs)/event')}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 5 }}
            >
              {(eventsQuery.data ?? []).map((e) => {
                const isFree = e.tipeBayar === 'GRATIS';
                const isBebas = e.tipeBayar === 'NOMINAL_BEBAS';
                // Color: GRATIS hijau, NOMINAL_BEBAS biru (sukarela), NOMINAL_TETAP amber (berbayar)
                const priceText = isFree
                  ? t('event.free')
                  : isBebas
                    ? lang === 'id' ? 'Persembahan' : 'Donation'
                    : `Rp ${(Number(e.nominal) / 1000).toLocaleString('id-ID')}rb`;
                const priceColorClass = isFree
                  ? 'text-emerald-600'
                  : isBebas
                    ? 'text-blue-600'
                    : 'text-amber-600';
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push(`/event/${e.slug || e.id}`)}
                    className="w-56 bg-white rounded-2xl overflow-hidden border border-neutral-100"
                  >
                    {/* Fit-to-width: tinggi proporsional sesuai aspect rasio asli image */}
                    <HeroImage
                      url={e.heroImageUrl}
                      fallbackEmoji="🎉"
                      emojiSize={40}
                      fitToWidth
                    />
                    <View className="p-3">
                      <Text className="text-[10px] text-neutral-500 mb-1" numberOfLines={1}>
                        {formatDate(e.tanggalMulai, lang)}
                      </Text>
                      <Text className="font-semibold text-sm text-neutral-900" numberOfLines={2}>
                        {e.judul}
                      </Text>
                      <Text className={`text-xs font-semibold mt-1 ${priceColorClass}`}>
                        {priceText}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>
        )}

        {/* Latest News */}
        <Section
          title={t('home.latest_news')}
          onSeeAll={() => router.push('/content?tab=news')}
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
                  onPress={() => router.push(`/content/news/${n.slug || n.id}`)}
                >
                  <HeroImage
                    url={n.heroImageUrl}
                    fallbackEmoji="📰"
                    emojiSize={22}
                    className="w-14 h-14 rounded-xl overflow-hidden"
                  />
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
