import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw,
  Repeat,
  UserCheck,
  Ticket,
  Video,
} from 'lucide-react-native';

import { MinistryTeamCard, MyDutyCard } from '@/components/ministry/MinistryTeamCard';
import { Button } from '@/components/ui/Button';
import { getIbadahDetail, getSelfCheckin, postSelfCheckin } from '@/api/ibadah';
import { SelfCheckinModal } from '@/components/ibadah/SelfCheckinModal';
import { ReservasiModal } from '@/components/ibadah/ReservasiModal';
import { useVenueCity, useVenueTz } from '@/hooks/useVenueTz';
import { localRangeIfDifferent, zoneTimeText } from '@/utils/time';
import { SelfCheckinCountdown, SelfCheckinEndsCountdown } from '@/components/ibadah/SelfCheckinCountdown';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { coordsForSelfCheckin, isRadiusError, SelfCheckinLocationError, showUsherFallback } from '@/utils/selfCheckinLocation';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { selfCheckinOpenNow as selfCheckinOpen, serverNowMs } from '@/utils/serverClock';
import { formatDateWithDay } from '@/utils/date';
import { getStreamLink } from '@/utils/ibadahOnline';
import { goBack } from '@/utils/nav';
import { OccupancyBar } from '@/components/ibadah/OccupancyBar';
import { IbadahTicketCard } from '@/components/tiket/IbadahTicketCard';
import { useMyReservasi } from '@/hooks/useMyReservasi';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { useNowTick } from '@/hooks/useNowTick';
import { isOccurrenceEnded } from '@/utils/time';
import { hariLabel } from '@/utils/hari';
import { useScreenInterval } from '@/hooks/useScreenInterval';
import { DeadlineCountdown } from '@/components/ui/DeadlineCountdown';
import { useSwipeLocked } from '@/components/tiket/swipeLock';
import { Collapsible, DetailTabs, EmptyPane, TicketCarousel, heroGradient, heroTop } from '@/components/detail/DetailBits';

export default function IbadahDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, tanggal } = useLocalSearchParams<{ id: string; tanggal?: string }>();
  const lang = i18n.language;

  // queryKey include tanggal supaya cache-aware per-occurrence (mis. petugas
  // berbeda Minggu 17 Mei vs Minggu 24 Mei → 2 cache entries terpisah).
  // Bump 'v2' 2026-05-24 — invalidate AsyncStorage cache lama dari sebelum
  // BE rename linkStream → linkOnline + add ke response.
  const query = useQuery({
    queryKey: ['ibadah', 'detail', 'v2', id, tanggal ?? null],
    queryFn: () => getIbadahDetail(id, tanggal),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnMount: 'always',
  });

  const ibadah = query.data;
  // Tiket reservasi saya / keluarga / tamu untuk ibadah ini (aktif).
  const myTicketsQ = useMyReservasi({ ibadahId: id, activeOnly: true }, { enabled: !!id });
  // Hanya tiket untuk pertemuan (tanggal) yang sedang dibuka — tiket tanggal
  // lain dari ibadah yang sama tidak ikut tampil.
  const myTickets = (myTicketsQ.data ?? []).filter(
    (r) => r.status !== 'CANCEL' && (!tanggal || (r.tanggalIbadah ?? '').slice(0, 10) === tanggal.slice(0, 10)),
  );
  // Jam jadwal = jam dinding cabang + label zona (mis. Waktu Kuala Lumpur);
  // bila zona HP berbeda, jam setempat ditampilkan sebagai keterangan.
  const branchTz = useVenueTz(ibadah?.cabang?.id);
  const venueTz = ibadah?.cabang?.timezone ?? branchTz;
  const venueCity = useVenueCity(ibadah?.cabang?.id, ibadah?.cabang?.nama);
  const localRange = ibadah ? localRangeIfDifferent(tanggal ?? null, ibadah.jamMulai, ibadah.jamSelesai, venueTz) : null;
  const timeHint = localRange ? t('time.your_time', { time: localRange }) : null;
  // Pertemuan tanggal ini sudah selesai → tombol reservasi disembunyikan.
  const nowDetail = useNowTick();
  const ended = !!ibadah && isOccurrenceEnded(tanggal ?? null, ibadah.jamMulai, ibadah.jamSelesai, venueTz, nowDetail);
  const showToast = useToast((s) => s.show);

  // Self check-in: status jendela (hari & jam ibadah) + saya & keluarga.
  // Refetch tiap menit supaya tombol muncul/hilang tepat waktu.
  const selfCheckin = useQuery({
    queryKey: ['ibadah', 'self-checkin', id],
    queryFn: () => getSelfCheckin(id),
    enabled: !!id,
    refetchInterval: useScreenInterval(60_000),
    staleTime: 30_000,
  });
  const queryClient = useQueryClient();
  const checkinMut = useMutation({
    // Self check-in dengan radius → ambil GPS segar dulu; server cek radius.
    mutationFn: async (ids: string[]) => postSelfCheckin(id, ids, await coordsForSelfCheckin(selfCheckin.data?.venue)),
  });
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [reservasiOpen, setReservasiOpen] = useState(false);

  // Pull to refresh (native) / tombol refresh (web) + refetch saat kembali ke layar.
  const [refreshing, setRefreshing] = useState(false);
  async function refreshAll() {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), selfCheckin.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }
  useRefetchOnFocus(() => {
    query.refetch();
    selfCheckin.refetch();
  }, !!id);

  // Jam acuan = jam server (bukan jam HP) → tombol muncul tepat 15 menit
  // sebelum ibadah & hilang di jam selesai walau jam/zona HP berbeda.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const sc = selfCheckin.data;
  // Kunci scroll saat slider "Geser untuk check-in" digeser (Android).
  const swipeLocked = useSwipeLocked();
  const checkinOpenNow = useMemo(() => selfCheckinOpen(sc), [sc, tick]);
  // Refetch persis di batas buka/tutup supaya status server ikut segar.
  useEffect(() => {
    if (!sc?.opensAt || !sc?.closesAt) return;
    const now = serverNowMs();
    const next = [Date.parse(sc.opensAt), Date.parse(sc.closesAt) + 1000].find((x) => x > now);
    if (!next || next - now > 6 * 60 * 60 * 1000) return;
    const t = setTimeout(() => {
      setTick((x) => x + 1);
      selfCheckin.refetch();
    }, next - now + 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sc?.opensAt, sc?.closesAt, tick]);
  const allCheckedIn =
    !!selfCheckin.data && selfCheckin.data.members.length > 0 && selfCheckin.data.members.every((m) => m.status === 'JOIN');

  // Tab di bawah: Tentang (deskripsi) & Tim pelayanan — hanya yang berisi.
  const hasDesc = !!ibadah?.deskripsi && ibadah.deskripsi.trim().length > 0;
  const teamCount = ibadah?.petugas?.length ?? 0;
  // Selalu tampil walau kosong → keterangan "tidak ada deskripsi" / "belum tersedia tim".
  const tabs = [
    { key: 'about', label: t('detail.tab_about') },
    { key: 'team', label: t('detail.tab_team'), badge: teamCount || undefined },
  ];
  const [tab, setTab] = useState<string>('about');
  const activeTab = tabs.some((x) => x.key === tab) ? tab : (tabs[0]?.key ?? 'about');
  // Header menyusut: setelah judul besar tergulir, nama ibadah tampil di bilah atas.
  const [scrolled, setScrolled] = useState(false);
  const streamLink = ibadah ? getStreamLink(ibadah) : null;
  const jadwalText = (() => {
    if (!ibadah) return '';
    const day = hariLabel(ibadah.hari);
    if (ibadah.tipeJadwal === 'WEEKLY' && day) return t('ibadah.every_day', { day });
    if (ibadah.tipeJadwal === 'BIWEEKLY' && day) return t('ibadah.every_other_day', { day });
    if (ibadah.tipeJadwal === 'MONTHLY' && day && ibadah.mingguKe) return t('ibadah.monthly_nth', { day, nth: t(`ibadah.nth_${ibadah.mingguKe}`) });
    if (ibadah.tipeJadwal === 'MONTHLY') return t('ibadah.monthly');
    if (ibadah.tipeJadwal === 'ONCE') return t('ibadah.once');
    return ibadah.tipeJadwal;
  })();

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Bilah atas (tetap) — menyatu dengan hero oranye di bawahnya */}
      <View style={{ backgroundColor: heroTop() }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-4 pt-1 pb-2">
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-white text-base font-semibold text-center px-2" numberOfLines={1}>
              {scrolled && ibadah ? ibadah.nama : t('ibadah.detail_title')}
            </Text>
            {Platform.OS === 'web' ? (
              <Pressable
                onPress={refreshAll}
                className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mr-2"
                accessibilityLabel={t('common.refresh')}
              >
                {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={18} color="#fff" />}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/my-reservasi' as never)}
              className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
              accessibilityLabel={t('ibadah.my_reservations') ?? 'Reservasi Saya'}
            >
              <Ticket size={18} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        scrollEnabled={!swipeLocked}
        scrollEventThrottle={32}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 70)}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#F97316" />}
      >
        {query.isPending ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-20">
            <Text className="text-sm text-red-600">{t('error.generic')}</Text>
            <Pressable onPress={() => query.refetch()} {...gx('mt-3 px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : ibadah ? (
          <>
            {/* Hero: kategori, nama, cabang (ikut tergulir) */}
            <View className="rounded-b-3xl px-5 pt-1 pb-14" style={[{ backgroundColor: heroTop() }, heroGradient()]}>
              {ibadah.kategoriIbadah ? (
                <View className="bg-white/15 rounded-full px-3 py-1 self-start mb-2">
                  <Text className="text-xs text-white font-medium">{ibadah.kategoriIbadah.nama}</Text>
                </View>
              ) : null}
              <Text className="text-2xl font-bold text-white">{ibadah.nama}</Text>
              <Text className="text-white/80 text-sm mt-1">{ibadah.cabang.nama}</Text>
            </View>

            {/* Kartu ringkasan (menumpang di hero): tanggal & jam, lokasi, jadwal, online, okupansi */}
            <View
              className="bg-card rounded-[20px] border border-neutral-100 mx-4 -mt-11"
              style={{ shadowColor: '#9A3412', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}
            >
              <SummaryRow
                first
                icon={<Calendar size={16} color="#EA580C" />}
                label={tanggal ? t('detail.date_time') : t('ibadah.time')}
                value={
                  tanggal
                    ? `${formatDateWithDay(tanggal, lang)} · ${zoneTimeText(ibadah.jamMulai, ibadah.jamSelesai, venueTz, lang, venueCity)}`
                    : zoneTimeText(ibadah.jamMulai, ibadah.jamSelesai, venueTz, lang, venueCity)
                }
                note={timeHint}
                right={
                  ended ? (
                    <View className="flex-row items-center gap-1 bg-neutral-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 size={11} color={nc('#525252')} />
                      <Text className="text-[10px] font-bold text-neutral-700">{t('ibadah.ended')}</Text>
                    </View>
                  ) : null
                }
              />
              <SummaryRow
                icon={<MapPin size={16} color="#EA580C" />}
                label={t('ibadah.location')}
                value={ibadah.lokasi?.trim() || ibadah.cabang?.nama || '—'}
                note={ibadah.isOnline && streamLink ? t('ibadah.online_service') : null}
                noteClass="text-emerald-600"
              />
              <SummaryRow icon={<Repeat size={16} color="#EA580C" />} label={t('ibadah.schedule')} value={jadwalText} />
              {streamLink ? (
                <View className="px-3.5 pb-3">
                  <Pressable
                    onPress={() => Linking.openURL(streamLink).catch(() => {})}
                    {...gx('bg-emerald-500 rounded-xl py-2.5 flex-row items-center justify-center gap-2')}
                  >
                    <Video size={16} color="#fff" />
                    <Text className="text-white font-semibold text-sm">{t('ibadah.access_online')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {ibadah.okupansi?.seat ? (
                <View className="px-3.5 pb-3.5 -mt-1.5 border-t border-neutral-100">
                  <OccupancyBar data={ibadah.okupansi} compact />
                </View>
              ) : null}
            </View>

            <View className="px-4 pt-3 gap-3">
              {/* Tugas saya — satu baris, ketuk → rincian (2.5.1) */}
              <MyDutyCard petugas={ibadah?.petugas} compact />
            </View>

            {/* Tiket Saya — digeser ke samping; geser check-in per tiket tetap */}
            {myTickets.length > 0 ? (
              <View className="pt-4">
                <TicketCarousel
                  title={t('tiket.my_tickets')}
                  items={myTickets}
                  keyOf={(r) => r.id}
                  padX={16}
                  render={(r) => (
                    <IbadahTicketCard
                      reservasi={r}
                      onPress={() =>
                        router.push(`/tiket?kind=ibadah&id=${r.id}&ibadahId=${r.ibadah.id}&tanggal=${r.tanggalIbadah.slice(0, 10)}` as never)
                      }
                    />
                  )}
                />
              </View>
            ) : null}

            {/* Tab: Tentang (deskripsi) | Tim pelayanan */}
            <View className="px-4 pt-4 gap-2.5">
              <DetailTabs tabs={tabs} value={activeTab} onChange={setTab} />
              {activeTab === 'about' ? (
                hasDesc ? (
                  <View className="bg-card rounded-2xl p-4 border border-neutral-100">
                    <Collapsible>
                      <Text className="text-sm text-neutral-700 leading-relaxed">{ibadah.deskripsi}</Text>
                    </Collapsible>
                  </View>
                ) : (
                  <EmptyPane text={t('detail.no_desc_ibadah')} />
                )
              ) : null}
              {/* Petugas — ketuk nama → profil (view-only) */}
              {activeTab === 'team' ? (
                teamCount ? <MinistryTeamCard petugas={ibadah.petugas} embedded /> : <EmptyPane text={t('detail.no_team')} />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA — QR + Self check-in (hanya saat hari & jam ibadah) */}
      <View className="bg-card border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          {/* Hitung mundur sampai self check-in dibuka (bawaan 15 menit sebelum ibadah; bisa diatur per ibadah) */}
          {!checkinOpenNow && sc?.reason === 'TOO_EARLY' && sc.opensAt ? (
            <SelfCheckinCountdown
              opensAt={sc.opensAt}
              openBeforeMin={sc.openBeforeMin}
              onDone={() => {
                setTick((x) => x + 1);
                selfCheckin.refetch();
              }}
            />
          ) : null}
          {/* Setelah ibadah selesai: "Self check-in akan berakhir dalam mm:ss" → lalu tombol hilang */}
          {checkinOpenNow && sc?.closesAt ? (
            <SelfCheckinEndsCountdown
              closesAt={sc.closesAt}
              endAt={sc.endAt}
              onDone={() => {
                setTick((x) => x + 1);
                selfCheckin.refetch();
              }}
            />
          ) : null}
          {!ended ? (
            <DeadlineCountdown
              closesAt={ibadah?.reservasiClosesAt}
              kind={ibadah?.isKidsIbadah ? 'kids' : 'ibadah'}
              className="mb-2"
            />
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                // Berdampingan dengan tombol lain → label pendek ("Tampilkan Q…" terpotong).
                label={checkinOpenNow || !ended ? t('ibadah.my_qr_short') : t('ibadah.show_my_qr')}
                onPress={() => router.push('/qr-card')}
                leftIcon={<QrCode size={16} color={checkinOpenNow ? nc('#171717') : '#fff'} />}
                variant={checkinOpenNow ? 'secondary' : 'primary'}
                fullWidth
                singleLine
                size="lg"
              />
            </View>
            {checkinOpenNow ? (
              <View className="flex-1">
                <Button
                  label={allCheckedIn ? t('ibadah.self_checkin_done_btn') : t('ibadah.self_checkin_btn')}
                  onPress={() => setCheckinOpen(true)}
                  leftIcon={<UserCheck size={16} color="#fff" />}
                  fullWidth
                  singleLine
                  size="lg"
                />
              </View>
            ) : ended ? null : (
              <View className="flex-1">
                <Button
                  label={t('reservasi.btn')}
                  onPress={() => setReservasiOpen(true)}
                  leftIcon={<CalendarPlus size={16} color={nc('#171717')} />}
                  variant="secondary"
                  fullWidth
                  singleLine
                  size="lg"
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      <ReservasiModal ibadahId={id} visible={reservasiOpen} onClose={() => setReservasiOpen(false)} />

      <SelfCheckinModal
        visible={checkinOpen}
        status={selfCheckin.data}
        loading={checkinMut.isPending}
        onGuestAdded={() => selfCheckin.refetch()}
        onClose={() => setCheckinOpen(false)}
        onConfirm={(ids) =>
          checkinMut.mutate(ids, {
            onSuccess: (r) => {
              setCheckinOpen(false);
              const ok = r.results.filter((x) => x.result === 'CHECKED_IN').map((x) => x.namaLengkap);
              showToast(
                ok.length ? t('ibadah.self_checkin_success', { names: ok.join(', ') }) : t('ibadah.self_checkin_all_done'),
                'success',
              );
              selfCheckin.refetch();
              void queryClient.invalidateQueries({ queryKey: ['my-reservasi'] });
            },
            onError: (e) => {
              // Di luar radius / lokasi tidak didapat → arahkan ke usher (QR).
              if (e instanceof SelfCheckinLocationError || isRadiusError(e)) {
                setCheckinOpen(false);
                showUsherFallback(e.message, () => router.push('/qr-card'));
              } else {
                showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
              }
              selfCheckin.refetch();
            },
          })
        }
      />
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  note,
  noteClass = 'text-neutral-500',
  right,
  first = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string | null;
  noteClass?: string;
  right?: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View className={`flex-row items-start gap-3 px-3.5 py-3 ${first ? '' : 'border-t border-neutral-100'}`}>
      <View className="w-8 h-8 rounded-[10px] bg-brand-50 items-center justify-center">{icon}</View>
      <View className="flex-1 min-w-0">
        <Text className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{label}</Text>
        <Text className="text-[13px] font-bold text-neutral-900 leading-[18px] mt-0.5">{value}</Text>
        {note ? <Text className={`text-[11px] mt-0.5 ${noteClass}`}>{note}</Text> : null}
      </View>
      {right}
    </View>
  );
}
