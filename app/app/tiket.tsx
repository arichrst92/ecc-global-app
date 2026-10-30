/**
 * Tampilan penuh tiket — QR besar, layar otomatis terang, geser antar-tiket
 * (keluarga / tamu di event atau ibadah yang sama), Simpan ke kalender, Petunjuk arah.
 *
 * Params:
 *   kind=event  &id=<participationId>&eventId=<eventId>[&scope=upcoming|history]
 *   kind=ibadah &id=<reservasiId>&ibadahId=<ibadahId>&tanggal=YYYY-MM-DD
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, Map, X } from 'lucide-react-native';

import { listMyEventTickets, type EventTiket, type TicketScope } from '@/api/tiket';
import { useMyReservasi } from '@/hooks/useMyReservasi';
import { EventTicketCard } from '@/components/tiket/EventTicketCard';
import { IbadahTicketCard } from '@/components/tiket/IbadahTicketCard';
import { TicketReviewCard } from '@/components/tiket/TicketReviewCard';
import { addTicketToCalendar, openDirections, ticketTimes } from '@/components/tiket/ticketActions';
import { useToast } from '@/components/ui/Toast';
import type { MyReservasi } from '@/types/ibadah';
import { goBack } from '@/utils/nav';
import { brandGradient } from '@/theme/gradient';

const BG = '#EA580C';

async function loadBrightness() {
  try {
    return await import('expo-brightness');
  } catch {
    return null;
  }
}

type Item = { kind: 'event'; t: EventTiket } | { kind: 'ibadah'; r: MyReservasi };

export default function TiketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { width } = useWindowDimensions();
  const p = useLocalSearchParams<{ kind: string; id: string; eventId?: string; scope?: string; ibadahId?: string; tanggal?: string }>();
  const isEvent = p.kind === 'event';
  const scope: TicketScope = p.scope === 'history' ? 'history' : 'upcoming';

  const evQ = useQuery({
    queryKey: ['event-tiket', scope, p.eventId ?? null],
    queryFn: () => listMyEventTickets(scope, p.eventId),
    enabled: isEvent && !!p.eventId,
  });
  const ibEnabled = !isEvent && !!p.ibadahId;
  const ibQ = useMyReservasi({ ibadahId: p.ibadahId, tanggal: p.tanggal, activeOnly: false }, { enabled: ibEnabled });

  const items: Item[] = useMemo(() => {
    if (isEvent) return (evQ.data ?? []).map((x) => ({ kind: 'event' as const, t: x }));
    if (!ibEnabled) return [];
    return (ibQ.data ?? []).map((x) => ({ kind: 'ibadah' as const, r: x }));
  }, [isEvent, ibEnabled, evQ.data, ibQ.data]);
  const startIndex = Math.max(0, items.findIndex((x) => (x.kind === 'event' ? x.t.id : x.r.id) === p.id));
  const [page, setPage] = useState(startIndex);
  const listRef = useRef<FlatList<Item>>(null);
  const insets = useSafeAreaInsets();
  // Tinggi area halaman tiket. ScrollView vertikal di dalam FlatList
  // horizontal tidak otomatis dibatasi tingginya (ikut tinggi konten) →
  // konten bawah terpotong & tidak bisa di-scroll. Batasi eksplisit.
  const [pageH, setPageH] = useState(0);

  // Layar terang selama tiket dibuka (QR mudah dipindai), kembali saat keluar.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return undefined;
      let prev: number | null = null;
      let active = true;
      // Dimuat saat dipakai (bukan import di atas): expo-router memuat semua
      // layar saat start, jadi modul native yang hilang di build lama tidak
      // boleh membuat app crash — cukup fitur kecerahan yang tidak jalan.
      loadBrightness()
        .then(async (B) => {
          if (!B || !active) return;
          prev = await B.getBrightnessAsync();
          await B.setBrightnessAsync(1);
        })
        .catch(() => {});
      return () => {
        active = false;
        if (prev != null) loadBrightness().then((B) => B?.setBrightnessAsync(prev!)).catch(() => {});
      };
    }, []),
  );

  const loading = isEvent ? evQ.isPending : ibQ.isPending;

  async function onCalendar(it: Item) {
    try {
      if (it.kind === 'event') {
        const times = ticketTimes(it.t.selfCheckin.opensAt, it.t.selfCheckin.closesAt);
        if (!times) throw new Error('no time');
        await addTicketToCalendar({ title: it.t.event.judul, ...times, location: it.t.event.lokasi ?? it.t.event.cabang?.nama });
      } else {
        const times = ticketTimes(it.r.selfCheckin?.opensAt, it.r.selfCheckin?.closesAt);
        if (!times) throw new Error('no time');
        await addTicketToCalendar({
          title: it.r.ibadah.nama,
          ...times,
          location: [it.r.ibadah.lokasi, it.r.ibadah.cabang?.nama].filter(Boolean).join(', '),
        });
      }
    } catch {
      showToast(t('tiket.calendar_failed'), 'error');
    }
  }

  function onDirections(it: Item) {
    const run =
      it.kind === 'event'
        ? openDirections({
            mapsUrl: it.t.event.mapsUrl,
            point: it.t.event.latitude != null && it.t.event.longitude != null ? { lat: it.t.event.latitude, lng: it.t.event.longitude } : null,
            label: it.t.event.lokasi ?? it.t.event.judul,
          })
        : openDirections({
            point: it.r.ibadah.point ?? null,
            label: [it.r.ibadah.lokasi, it.r.ibadah.cabang?.nama].filter(Boolean).join(', ') || it.r.ibadah.nama,
          });
    run.catch(() => {});
  }

  return (
    <View style={[{ flex: 1, backgroundColor: BG }, brandGradient()]}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable onPress={() => goBack(router, '/my-reservasi')} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.close')}>
            <X size={22} color="#fff" />
          </Pressable>
          <Text className="text-white font-bold">{t(isEvent ? 'tiket.detail_title_event' : 'tiket.detail_title_ibadah')}</Text>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fff" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-center">{t('tiket.not_found')}</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            style={{ flex: 1 }}
            onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(x) => (x.kind === 'event' ? x.t.id : x.r.id)}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height: pageH || undefined }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: items.length > 1 ? 24 : insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {item.kind === 'event' ? (
                  <EventTicketCard ticket={item.t} variant="full" notchColor={BG} />
                ) : (
                  <IbadahTicketCard reservasi={item.r} variant="full" notchColor={BG} />
                )}
                <Text className="text-white/90 text-[11px] text-center mt-3">{t('tiket.bright_hint')}</Text>
                <View className="flex-row gap-2 mt-3">
                  {Platform.OS !== 'web' ? (
                    <Pressable
                      onPress={() => onCalendar(item)}
                      className="flex-1 rounded-xl py-3 flex-row items-center justify-center gap-1.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                    >
                      <CalendarPlus size={15} color="#fff" />
                      <Text className="text-white text-xs font-semibold">{t('tiket.add_calendar')}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => onDirections(item)}
                    className="flex-1 rounded-xl py-3 flex-row items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <Map size={15} color="#fff" />
                    <Text className="text-white text-xs font-semibold">{t('tiket.directions')}</Text>
                  </Pressable>
                </View>
                {item.kind === 'event' ? (
                  item.t.isSelf ? <TicketReviewCard kind="EVENT" ticketId={item.t.id} /> : null
                ) : !item.r.relation || item.r.relation === 'SELF' ? (
                  <TicketReviewCard kind="IBADAH" ticketId={item.r.id} />
                ) : null}
              </ScrollView>
            )}
          />
          {items.length > 1 ? (
            <SafeAreaView edges={['bottom']}>
              <View className="flex-row justify-center gap-1.5 pt-1">
                {items.map((x, i) => (
                  <View
                    key={x.kind === 'event' ? x.t.id : x.r.id}
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', opacity: i === page ? 1 : 0.45 }}
                  />
                ))}
              </View>
              <Text className="text-white/90 text-[11px] text-center mt-1 mb-2">
                {t('tiket.swipe_more', { count: items.length })}
              </Text>
            </SafeAreaView>
          ) : null}
        </>
      )}
    </View>
  );
}
