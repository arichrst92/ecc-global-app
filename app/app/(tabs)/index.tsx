import { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { EventListItem } from '@/types/event';
import { CalendarDays, CheckCircle2, Church, Clock, MapPin, QrCode, ChevronRight, Video } from 'lucide-react-native';

import { MinistryChip, MinistryIcon } from '@/components/ministry/MinistryIcon';
import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { BranchChip } from '@/components/branch/BranchChip';
import { GuestHomeView } from '@/components/GuestHomeView';
import { NotificationBell } from '@/components/NotificationBell';
import { QuickAccess } from '@/components/home/QuickAccess';
import { ContactHint } from '@/components/profile/ContactHint';
import { ScannerHeaderButton } from '@/components/home/ScannerHeaderButton';
import { NowPlayingCard } from '@/components/worship/NowPlayingCard';
import { HomecellSpotlight } from '@/components/home/HomecellSpotlight';
import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { useAuthStore } from '@/stores/auth.store';
import { useTodayServices, useLatestRenungan, useLatestNews } from '@/hooks/useHomeData';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SelfCheckinBar } from '@/components/checkin/SelfCheckinBar';
import { useHomeEvents } from '@/hooks/useHomeEvents';
import { useMyMinistrySchedule } from '@/hooks/useMinistry';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getIbadahDetail, getSelfCheckin, postSelfCheckin } from '@/api/ibadah';
import { useVenueCity, useVenueTz } from '@/hooks/useVenueTz';
import { cabangCity, formatScheduleWithZone, venueToLocal, ymdInTz } from '@/utils/time';
import { formatDate } from '@/utils/date';
import { getStreamLink } from '@/utils/ibadahOnline';
import { OccupancyBar } from '@/components/ibadah/OccupancyBar';
import type { MyEventDuty, MyMinistryAssignment } from '@/types/ministrySchedule';
import { tugasText } from '@/api/ministry';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { useNowTick } from '@/hooks/useNowTick';
import { eventCount } from '@/utils/eventCount';
import { selfCheckinGraceMs, isOccurrenceEnded } from '@/utils/time';
import { HeroStatusBar, useHeroScroll } from '@/components/ui/HeroStatusBar';
import { rupiahShort } from '@/utils/hari';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { eventPriceLabel, eventPriceTone } from '@/utils/eventPrice';
import { DeadlineCountdown } from '@/components/ui/DeadlineCountdown';

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
  const hero = useHeroScroll();
  // Banner "Sedang menjelajahi" tampil (sama dengan syarat di ViewingBanner) → ia yang memberi jarak status bar.
  const vb = useViewingBranch();
  const bannerShown = !vb.isHome && !!vb.branch;
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

  const queryClient = useQueryClient();
  // Spinner hanya saat ditarik (bukan saat refetch otomatis dari cache).
  const { refreshing: isRefreshing, onRefresh: refresh } = usePullToRefresh(() =>
    Promise.all([
      todayQuery.refetch(),
      renunganQuery.refetch(),
      newsQuery.refetch(),
      eventsQuery.refetch(),
      myScheduleQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['homecell', 'me'] }),
      // Akses scan yang baru diberikan → ikon Scanner langsung muncul.
      queryClient.invalidateQueries({ queryKey: ['scanner', 'events'] }),
      queryClient.invalidateQueries({ queryKey: ['scanner', 'ibadah'] }),
    ]),
  );

  // Ibadah yang sudah selesai diletakkan paling bawah (kartu diburamkan).
  const homeTz = useVenueTz();
  const nowHome = useNowTick();
  const todayServices = [...(todayQuery.data ?? [])].sort(
    (a, b) =>
      Number(isOccurrenceEnded(a.tanggal, a.jamMulai, a.jamSelesai, homeTz, nowHome)) -
      Number(isOccurrenceEnded(b.tanggal, b.jamMulai, b.jamSelesai, homeTz, nowHome)),
  );

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
      <ScrollView onScroll={hero.onScroll} scrollEventThrottle={16}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#F97316" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Persistent viewing banner kalau != home */}
        {/* Banner di paling atas → beri jarak status bar; header tidak menambah jarak lagi. */}
        <ViewingBanner safeTop />

        {/* Header gradient */}
        <View {...gx('bg-brand-500 pb-6 rounded-b-3xl')}>
          <SafeAreaView edges={bannerShown ? [] : ['top']}>
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
        {/* Pengingat lengkapi kontak (email / WhatsApp) — bisa ditutup 30 hari. */}
        <ContactHint dismissible className="mx-5 mt-4" />

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

        {/* Renungan hari ini — tidak ada renungan hari ini → section disembunyikan */}
        {renungan || renunganQuery.isPending ? (
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
                <Text className="font-bold text-neutral-900" numberOfLines={1}>
                  {renungan.judul}
                </Text>
                <Text className="text-sm text-neutral-500 mt-1" numberOfLines={2}>
                  {renungan.ringkasan}
                </Text>
              </View>
            </Pressable>
          ) : (
            <SkeletonCard height={140} />
          )}
        </Section>
        ) : null}

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
              contentContainerStyle={{ gap: 12, paddingRight: 5, alignItems: 'stretch' }}
            >
              {(eventsQuery.data ?? []).map((e) => (
                <HomeEventCard
                  key={e.id}
                  e={e}
                  now={nowHome}
                  lang={lang}
                  onPress={() => router.push(`/event/${e.slug || e.id}`)}
                />
              ))}
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
              <ElsEmptyIcon size={48} />
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
      <HeroStatusBar scrolled={hero.scrolled} />

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
    /** Server ≥ 2026-11: self check-in pertemuan ini ditutup. */
    checkinClosesAt?: string;
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
  const venueCity = useVenueCity(detailQuery.data?.cabang?.id, detailQuery.data?.cabang?.nama ?? service.cabang?.nama);
  // Ibadah hari ini yang sudah lewat jam selesai → kartu diburamkan + label "Sudah selesai".
  const now = useNowTick();
  const svcTz = detailQuery.data?.cabang?.timezone ?? venueTz;
  const ended = isOccurrenceEnded(service.tanggal, service.jamMulai, service.jamSelesai, svcTz, now);
  // Kartu diburamkan setelah self check-in ditutup: server ≥ 2026-11 mengirim
  // checkinClosesAt (bisa diatur per ibadah; tidak lebih awal dari jam selesai);
  // server lama → selesai + tenggang 30 menit.
  const closesAtIso = detailQuery.data?.checkinClosesAt ?? service.checkinClosesAt;
  const checkinClosed = closesAtIso
    ? ended && now > Date.parse(closesAtIso)
    : isOccurrenceEnded(service.tanggal, service.jamMulai, service.jamSelesai, svcTz, now - selfCheckinGraceMs());
  // Jadwal tampil dalam jam & zona cabang; bila zona HP berbeda, tambah jam setempat.
  const localStart = venueToLocal(service.tanggal, service.jamMulai, venueTz);
  const hint = localStart?.converted ? t('time.your_time', { time: localStart.time }) : null;

  return (
    <View className="bg-card rounded-2xl overflow-hidden border border-neutral-100" style={checkinClosed ? { opacity: 0.55 } : undefined}>
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            {ended ? (
              <View className="flex-row items-center gap-1 bg-neutral-200 rounded-full px-2 py-0.5">
                <CheckCircle2 size={12} color={nc('#525252')} />
                <Text className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">{t('ibadah.ended')}</Text>
              </View>
            ) : (
              <>
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {t('home.today_service')}
                </Text>
              </>
            )}
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
            {formatScheduleWithZone({ ymd: service.tanggal, start: service.jamMulai, end: service.jamSelesai, tz: venueTz, lang: i18nSvc.language, city: venueCity })}
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
        {checkinClosed ? null : <SelfCheckinBar
          compact
          allowAddGuest
          showEndsCountdown
          queryKey={['ibadah', 'self-checkin', service.ibadahId]}
          fetcher={() => getSelfCheckin(service.ibadahId)}
          submit={(ids, coords) => postSelfCheckin(service.ibadahId, ids, coords)}
        />}

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
      ? `${formatScheduleWithZone({ ymd: item.a.tanggal.slice(0, 10), start: item.a.ibadahJamMulai, end: item.a.ibadahJamSelesai, tz: item.a.timezone, lang, city: cabangCity(item.a.cabangNama) })} · ${item.a.ibadahNama}`
      : `${formatScheduleWithZone({
          ymd: ymdInTz(item.e.tanggalMulai, item.e.cabang?.timezone),
          endYmd: ymdInTz(item.e.tanggalSelesai, item.e.cabang?.timezone),
          start: item.e.jamMulai,
          end: item.e.jamSelesai,
          tz: item.e.cabang?.timezone,
          city: cabangCity(item.e.cabang?.nama),
          lang,
        })} · ${item.e.judul}`;
  const tugas = tugasText(item.kind === 'ibadah' ? item.a.tugas : item.e.tugas);
  const posisi = `${item.kind === 'ibadah' ? item.a.posisi : item.e.posisi}${tugas ? ` · ${tugas}` : ''}`;
  const ministry = item.kind === 'ibadah' ? item.a.ministryNama : item.e.ministryNama;
  const mIkon = item.kind === 'ibadah' ? item.a.ministryIkon : item.e.ministryIkon;
  const mWarna = item.kind === 'ibadah' ? item.a.ministryWarna : item.e.ministryWarna;

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      className={`px-3.5 py-3 flex-row items-center gap-3 ${
        isFirst ? '' : 'border-t border-neutral-100'
      }`}
    >
      <MinistryIcon ikon={mIkon} warna={mWarna} size={40} />
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


/**
 * Status saya di kartu event Beranda (server ≥ 2026-11 mengirim `myStatus`).
 * Menempel di bawah kartu (mt-auto) — 1 baris. Event sukarela tanpa partisipasi → ajakan memberi.
 */
/**
 * Kartu event di Beranda (geser horizontal). Tata letak tetap supaya rapi &
 * tidak ada teks bertumpuk di HP mana pun:
 *  - gambar kotak 16:10 yang sama untuk semua kartu (poster utuh, latar buram);
 *  - judul selalu memakan 2 baris (kartu sejajar);
 *  - baris info ber-ikon (tanggal, lokasi) dengan tinggi baris eksplisit;
 *  - kuota satu baris + bar; batas pendaftaran singkat; flag harga menempel di dasar kartu.
 */
function HomeEventCard({ e, now, lang, onPress }: { e: EventListItem; now: number; lang: string; onPress: () => void }) {
  const { t } = useTranslation();
  // Warna & label sama dengan daftar/detail event (utils/eventPrice).
  const priceText = eventPriceLabel(e, t);
  const tone = eventPriceTone(e.tipeBayar);
  const jadwal = formatScheduleWithZone({
    ymd: ymdInTz(e.tanggalMulai, e.cabang?.timezone),
    endYmd: ymdInTz(e.tanggalSelesai, e.cabang?.timezone),
    start: e.jamMulai,
    end: e.jamSelesai,
    tz: e.cabang?.timezone,
    city: cabangCity(e.cabang?.nama),
    lang,
  });
  const lokasi = e.lokasi?.trim() && e.lokasi.trim() !== '-' ? e.lokasi.trim() : null;
  const shown = e.quotaPeserta ? eventCount(e, now) : null;
  return (
    <Pressable
      onPress={onPress}
      className="w-60 bg-card rounded-2xl overflow-hidden border border-neutral-100 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={e.judul}
    >
      <HeroImage url={e.heroImageUrl} fallbackEmoji="🎉" emojiSize={40} contain style={{ width: '100%', aspectRatio: 16 / 10 }} />
      <View className="p-3 flex-1">
        {/* Judul — selalu setinggi 2 baris supaya semua kartu sejajar */}
        <Text className="font-semibold text-sm leading-5 text-neutral-900" numberOfLines={2} style={{ minHeight: 40 }}>
          {e.judul}
        </Text>

        <View className="mt-2 gap-1">
          <View className="flex-row items-start gap-1.5">
            <CalendarDays size={12} color={nc('#A3A3A3')} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-[11px] leading-4 text-neutral-600" numberOfLines={2}>
              {jadwal}
            </Text>
          </View>
          {lokasi ? (
            <View className="flex-row items-start gap-1.5">
              <MapPin size={12} color={nc('#A3A3A3')} style={{ marginTop: 2 }} />
              <Text className="flex-1 text-[11px] leading-4 text-neutral-600" numberOfLines={1}>
                {lokasi}
              </Text>
            </View>
          ) : null}
          {/* Event sukarela: ringkasan singkat (kartu tidak kosong). */}
          {e.tipeBayar === 'NOMINAL_BEBAS' && e.ringkasan?.trim() ? (
            <Text className="text-[11px] leading-4 text-neutral-500" numberOfLines={2}>
              {e.ringkasan.trim()}
            </Text>
          ) : null}
        </View>

        {shown && e.quotaPeserta ? (
          // Sebelum check-in dibuka → terdaftar; sesudahnya → hadir.
          <View className="mt-2">
            <Text className="text-[11px] leading-4 text-neutral-500 mb-1" numberOfLines={1}>
              {t(shown.attending ? 'event.quota_attending' : 'event.quota_registered', { count: shown.count, quota: e.quotaPeserta })}
            </Text>
            <View className="h-1 bg-neutral-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${shown.count >= e.quotaPeserta ? 'bg-red-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(100, Math.round((shown.count / e.quotaPeserta) * 100))}%` }}
              />
            </View>
          </View>
        ) : null}
        {e.tipeBayar === 'NOMINAL_BEBAS' ? null : (
          <DeadlineCountdown closesAt={e.registrationClosesAt} kind="event" compact short className="mt-2" />
        )}
        {/* Paling bawah (menempel di dasar kartu): flag harga Gratis / Sukarela / Rp…
            — menggantikan kotak status hijau (status pendaftaran tetap di detail event & tiket). */}
        <View className="mt-auto pt-2.5">
          <View className={`self-start px-2.5 py-1 rounded-full ${tone.soft}`}>
            <Text className={`text-[11px] leading-4 font-semibold ${tone.text}`} numberOfLines={1}>
              {priceText}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

