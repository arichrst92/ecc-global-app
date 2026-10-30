import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpen, Church, Clock, MapPin, QrCode, ChevronRight, Newspaper, CalendarDays, Video, HeartHandshake, Ticket } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { BranchChip } from '@/components/branch/BranchChip';
import { GuestHomeView } from '@/components/GuestHomeView';
import { NotificationBell } from '@/components/NotificationBell';
import { QuickAccess } from '@/components/home/QuickAccess';
import { ScannerHeaderButton } from '@/components/home/ScannerHeaderButton';
import { NowPlayingCard } from '@/components/worship/NowPlayingCard';
import { HomecellSpotlight } from '@/components/home/HomecellSpotlight';
import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { useAuthStore } from '@/stores/auth.store';
import { useTodayServices, useLatestRenungan, useLatestNews } from '@/hooks/useHomeData';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { SelfCheckinBar } from '@/components/checkin/SelfCheckinBar';
import { useHomeEvents } from '@/hooks/useHomeEvents';
import { useMyMinistrySchedule } from '@/hooks/useMinistry';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getIbadahDetail, getSelfCheckin, postSelfCheckin } from '@/api/ibadah';
import { useVenueTz } from '@/hooks/useVenueTz';
import { formatScheduleWithZone, venueToLocal, ymdInTz } from '@/utils/time';
import { formatDate } from '@/utils/date';
import { getStreamLink } from '@/utils/ibadahOnline';
import { OccupancyBar } from '@/components/ibadah/OccupancyBar';
import type { MyEventDuty, MyMinistryAssignment } from '@/types/ministrySchedule';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

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

  const todayQuery = useTodayServices();
  // Cache dipersist → ambil ulang saat kembali ke beranda / app aktif lagi.
  useRefetchOnFocus(() => todayQuery.refetch());
  const renunganQuery = useLatestRenungan();
  const newsQuery = useLatestNews();
  const eventsQuery = useHomeEvents();
  useRefetchOnFocus(() => eventsQuery.refetch());
  // "Pelayanan Saya" widget — BE endpoint mungkin belum di-deploy, hook
  // gracefully fallback ke [] (lihat useMinistry.ts / api/ministry.ts).
  // Widget silently hide kalau data kosong, tidak show error state.
  const myScheduleQuery = useMyMinistrySchedule();
  const lang = i18n.language;

  const isRefreshing =
    todayQuery.isRefetching ||
    renunganQuery.isRefetching ||
    newsQuery.isRefetching ||
    eventsQuery.isRefetching ||
    myScheduleQuery.isRefetching;

  const queryClient = useQueryClient();
  function refresh() {
    todayQuery.refetch();
    renunganQuery.refetch();
    newsQuery.refetch();
    eventsQuery.refetch();
    myScheduleQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ['homecell', 'me'] });
  }

  const todayServices = todayQuery.data ?? [];

  if (!user) return null;

  const renungan = renunganQuery.data;
  const news = newsQuery.data ?? [];
  // Max 3 upcoming assignments, sorted by tanggal ASC (defensive — BE spec
  // tidak eksplisit guarantee order untuk endpoint cross-ministry ini).
  // Gabungan tugas ibadah + event, urut tanggal; tap → halaman ibadah / event.
  const myUpcomingSchedule: ScheduleItem[] = [
    ...(myScheduleQuery.data?.assignments ?? []).map((a) => ({
      kind: 'ibadah' as const,
      key: `i-${a.id}`,
      sort: `${a.tanggal.slice(0, 10)} ${a.ibadahJamMulai ?? ''}`,
      a,
    })),
    ...(myScheduleQuery.data?.events ?? []).map((e) => ({
      kind: 'event' as const,
      key: `e-${e.id}`,
      sort: `${e.tanggalMulai.slice(0, 10)} ${e.jamMulai ?? ''}`,
      e,
    })),
  ]
    .sort((x, y) => x.sort.localeCompare(y.sort))
    .slice(0, 3);

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
        <View {...gx('bg-brand-500 pb-6 rounded-b-3xl')}>
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
                    {user.namaLengkap}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <ScannerHeaderButton />
                <Pressable
                  onPress={() => router.push('/qr-card')}
                  className="bg-white/15 rounded-full p-2"
                  accessibilityLabel={t('home.show_qr')}
                >
                  <QrCode size={20} color="#fff" />
                </Pressable>
                <NotificationBell variant="light" badgeBorderColor="#F97316" />
              </View>
            </View>


            {/* Branch context chip — tap untuk switch view */}
            <View className="mx-5 mt-2">
              <BranchChip variant="header" onPress={() => setSwitcherOpen(true)} />
            </View>
          </SafeAreaView>
        </View>

        {/* Homecell Spotlight — fokus utama ECC: homecell saya / pertemuan
            berikutnya / ajakan bergabung. Menumpang di bawah header. */}
        <HomecellSpotlight />

        {/* Quick Access — visible sesuai otoritas */}
        {/* ECC Worship — hanya tampil saat ada lagu aktif */}
        <NowPlayingCard />

        <QuickAccess />

        {/* Today's Services — render SEMUA occurrence hari ini (bukan cuma
            yang pertama). Beberapa cabang punya 2-3 ibadah per hari (mis.
            ibadah pagi, siang, sore). Stacked vertically. */}
        {todayQuery.isPending ? (
          <View className="px-5 mt-4">
            <SkeletonCard height={120} />
          </View>
        ) : todayServices.length > 0 ? (
          <View className="px-5 mt-4 gap-3">
            {todayServices.map((svc) => (
              <TodayServiceCard
                key={`${svc.ibadahId}-${svc.tanggal}-${svc.jamMulai}`}
                service={svc}
                router={router}
                t={t}
              />
            ))}
          </View>
        ) : null}

        {/* Renungan today */}
        <Section
          title={t('home.today_devotional')}
          onSeeAll={() => router.push('/content?tab=renungan')}
        >
          {renungan ? (
            <Pressable
              className="bg-card rounded-2xl overflow-hidden border border-neutral-100"
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
          ) : (
            <View className="bg-card rounded-2xl p-4 border border-neutral-100 items-center">
              <BookOpen size={24} color={nc('#A3A3A3')} />
              <Text className="text-sm text-neutral-500 mt-2">{t('home.no_devotional')}</Text>
            </View>
          )}
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
                    className="w-56 bg-card rounded-2xl overflow-hidden border border-neutral-100"
                  >
                    {/* Fit-to-width: tinggi proporsional sesuai aspect rasio asli image */}
                    <HeroImage
                      url={e.heroImageUrl}
                      fallbackEmoji="🎉"
                      emojiSize={40}
                      fitToWidth
                    />
                    <View className="p-3">
                      <Text className="text-[10px] text-neutral-500 mb-1" numberOfLines={2}>
                        {formatScheduleWithZone({
                          ymd: ymdInTz(e.tanggalMulai, e.cabang?.timezone),
                          endYmd: ymdInTz(e.tanggalSelesai, e.cabang?.timezone),
                          start: e.jamMulai,
                          end: e.jamSelesai,
                          tz: e.cabang?.timezone,
                          lang,
                        })}
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
            <View className="bg-card rounded-2xl p-4 border border-neutral-100 items-center">
              <Newspaper size={24} color={nc('#A3A3A3')} />
              <Text className="text-sm text-neutral-500 mt-2">{t('home.no_news')}</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {news.map((n) => (
                <Pressable
                  key={n.id}
                  className="bg-card rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
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

        {/* Pelayanan Saya — "Ministry Schedule/Roster" widget, per
            docs/backend-request-ministry-schedule-roster.md. BE endpoint
            belum di-deploy; myScheduleQuery gracefully resolve ke [] kalau
            404, jadi widget hide entirely (silent) sampai BE ready. */}
        {myUpcomingSchedule.length > 0 ? (
          <Section title={t('ministry.my_schedule_title')}>
            <View className="bg-card rounded-2xl border border-neutral-100 overflow-hidden">
              <View className="px-3.5 pt-3 pb-1 flex-row items-center justify-between">
                <Text className="text-xs text-neutral-500">
                  {t('ministry.my_schedule_subtitle')}
                </Text>
                <View className="bg-brand-50 px-1.5 py-0.5 rounded">
                  <Text className="text-[10px] font-semibold text-brand-700">
                    {myUpcomingSchedule.length}
                  </Text>
                </View>
              </View>
              {myUpcomingSchedule.map((item, idx) => (
                <MyScheduleRow
                  key={item.key}
                  item={item}
                  isFirst={idx === 0}
                  lang={lang}
                  router={router}
                  t={t}
                />
              ))}
            </View>
          </Section>
        ) : null}
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

/**
 * Card untuk satu ibadah occurrence di "Ibadah Hari Ini". Each card own
 * its supplemental detail fetch — calendar endpoint tidak return
 * linkStream/linkOnline, detail endpoint DOES. Cost: N extra API calls
 * untuk N ibadah hari ini (typically 1-3 — affordable).
 */
function TodayServiceCard({
  service,
  router,
  t,
}: {
  service: {
    ibadahId: string;
    tanggal: string;
    nama: string;
    jamMulai: string;
    jamSelesai: string;
    lokasi: string | null;
    isOnline: boolean;
    kategoriIbadah?: { nama: string } | null;
    cabang?: { nama: string } | null;
  };
  router: ReturnType<typeof useRouter>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { i18n: i18nSvc } = useTranslation();
  const detailQuery = useQuery({
    queryKey: ['ibadah', 'detail', 'v2', service.ibadahId, service.tanggal],
    queryFn: () => getIbadahDetail(service.ibadahId, service.tanggal),
    enabled: !!service.ibadahId,
    staleTime: 60_000,
  });
  const streamLink = getStreamLink(detailQuery.data) ?? getStreamLink(service);
  // Lokasi: data detail terbaru → data kalender → nama cabang (kalau lokasi
  // ibadah belum diisi admin).
  const lokasi = detailQuery.data?.lokasi?.trim() || service.lokasi?.trim() || service.cabang?.nama || null;
  // Jam jadwal = jam dinding cabang → tampil di zona waktu HP.
  const venueTz = useVenueTz(detailQuery.data?.cabang?.id);
  // Jadwal tampil dalam jam & zona cabang; bila zona HP berbeda, tambah jam setempat.
  const localStart = venueToLocal(service.tanggal, service.jamMulai, venueTz);
  const hint = localStart?.converted ? t('time.your_time', { time: localStart.time }) : null;

  return (
    <View className="bg-card rounded-2xl overflow-hidden border border-neutral-100">
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              {t('home.today_service')}
            </Text>
          </View>
          {service.kategoriIbadah ? (
            <View className="bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5">
              <Text className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                {service.kategoriIbadah.nama}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-lg font-bold text-neutral-900">{service.nama}</Text>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Clock size={14} color={nc('#737373')} />
          <Text className="text-sm text-neutral-500">
            {formatScheduleWithZone({ ymd: service.tanggal, start: service.jamMulai, end: service.jamSelesai, tz: venueTz, lang: i18nSvc.language })}
          </Text>
        </View>
        {hint ? <Text className="text-[11px] text-neutral-400 mt-0.5 ml-6">{hint}</Text> : null}
        {lokasi ? (
          <View className="flex-row items-start gap-2 mt-1">
            <MapPin size={14} color={nc('#737373')} style={{ marginTop: 2 }} />
            <Text className="text-sm text-neutral-500 flex-1" numberOfLines={2}>
              {lokasi}
            </Text>
          </View>
        ) : null}

        <OccupancyBar compact data={detailQuery.data?.okupansi} />

        {/* Self check-in: hitung mundur → tombol (hari & jam ibadah, sesuai radius) */}
        <SelfCheckinBar
          compact
          allowAddGuest
          queryKey={['ibadah', 'self-checkin', service.ibadahId]}
          fetcher={() => getSelfCheckin(service.ibadahId)}
          submit={(ids, coords) => postSelfCheckin(service.ibadahId, ids, coords)}
        />

        {streamLink ? (
          <Pressable
            onPress={() => Linking.openURL(streamLink).catch(() => {})}
            className="mt-3 bg-emerald-500 rounded-xl py-2.5 flex-row items-center justify-center gap-2"
          >
            <Video size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm">
              {t('ibadah.access_online')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row border-t border-neutral-100">
        <Pressable
          className="flex-1 py-3 flex-row items-center justify-center gap-2"
          onPress={() => router.push(`/ibadah/${service.ibadahId}?tanggal=${service.tanggal}` as never)}
        >
          <Church size={16} color={nc('#525252')} />
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
  );
}

type ScheduleItem =
  | { kind: 'ibadah'; key: string; sort: string; a: MyMinistryAssignment }
  | { kind: 'event'; key: string; sort: string; e: MyEventDuty };

/**
 * Satu baris tugas di widget "Pelayanan Saya" home tab.
 * Tap → halaman ibadah (tanggal tugas) atau event yang bersangkutan.
 */
function MyScheduleRow({
  item,
  isFirst,
  lang,
  router,
  t: _t,
}: {
  item: ScheduleItem;
  isFirst: boolean;
  lang: string;
  router: ReturnType<typeof useRouter>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const isEvent = item.kind === 'event';
  const href =
    item.kind === 'ibadah'
      ? `/ibadah/${item.a.ibadahId}?tanggal=${item.a.tanggal.slice(0, 10)}`
      : `/event/${item.e.eventId}`;
  const meta =
    item.kind === 'ibadah'
      ? `${formatScheduleWithZone({ ymd: item.a.tanggal.slice(0, 10), start: item.a.ibadahJamMulai, end: item.a.ibadahJamSelesai, tz: item.a.timezone, lang })} · ${item.a.ibadahNama}`
      : `${formatScheduleWithZone({
          ymd: ymdInTz(item.e.tanggalMulai, item.e.cabang?.timezone),
          endYmd: ymdInTz(item.e.tanggalSelesai, item.e.cabang?.timezone),
          start: item.e.jamMulai,
          end: item.e.jamSelesai,
          tz: item.e.cabang?.timezone,
          lang,
        })} · ${item.e.judul}`;
  const posisi = item.kind === 'ibadah' ? item.a.posisi : item.e.posisi;
  const ministry = item.kind === 'ibadah' ? item.a.ministryNama : item.e.ministryNama;

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      className={`px-3.5 py-3 flex-row items-center gap-3 ${
        isFirst ? '' : 'border-t border-neutral-100'
      }`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${isEvent ? 'bg-violet-50' : 'bg-brand-50'}`}>
        {isEvent ? <Ticket size={18} color="#7C3AED" /> : <HeartHandshake size={18} color="#EA580C" />}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-xs text-neutral-500" numberOfLines={2}>
          {meta}
        </Text>
        <Text className="text-sm font-semibold text-neutral-900 mt-0.5" numberOfLines={1}>
          {posisi}
        </Text>
        <Text className="text-xs text-brand-600 mt-0.5" numberOfLines={1}>
          {ministry}
        </Text>
      </View>
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}
