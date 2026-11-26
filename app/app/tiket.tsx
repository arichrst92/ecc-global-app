/**
 * Tampilan penuh tiket — QR besar, layar otomatis terang, geser antar-tiket
 * (keluarga / tamu di event atau ibadah yang sama), Simpan ke kalender, Petunjuk arah.
 *
 * Params:
 *   kind=event  &id=<participationId>&eventId=<eventId>[&scope=upcoming|history]
 *   kind=ibadah &id=<reservasiId>&ibadahId=<ibadahId>&tanggal=YYYY-MM-DD
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, Download, Map, X } from 'lucide-react-native';

import { listMyEventTickets, type EventTiket, type TicketScope } from '@/api/tiket';
import { useMyReservasi } from '@/hooks/useMyReservasi';
import { EventTicketCard, hasEventLokasi } from '@/components/tiket/EventTicketCard';
import { IbadahTicketCard } from '@/components/tiket/IbadahTicketCard';
import { TicketReviewCard } from '@/components/tiket/TicketReviewCard';
import { addTicketToCalendar, openDirections, ticketTimes } from '@/components/tiket/ticketActions';
import { useToast } from '@/components/ui/Toast';
import type { MyReservasi } from '@/types/ibadah';
import { goBack } from '@/utils/nav';
import { brandGradient } from '@/theme/gradient';
import { useSwipeLocked } from '@/components/tiket/swipeLock';
import { useKeepPage } from '@/hooks/useFoldSafe';

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
  // Android edge-to-edge: ruang bawah setinggi keyboard untuk kolom ulasan.
  const kbH = useKeyboardHeight();
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
  // Kunci scroll saat slider "Geser untuk check-in" digeser (Android).
  const swipeLocked = useSwipeLocked();
  // Scroll per halaman tiket — dipakai supaya kolom komentar ulasan tidak tertutup keyboard.
  const pageRefs = useRef<Record<string, ScrollView | null>>({});
  const focusedPage = useRef<string | null>(null);
  const scrollPageToEnd = (key: string) => {
    focusedPage.current = key;
    setTimeout(() => pageRefs.current[key]?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 350 : 250);
  };
  // Setelah keyboard benar-benar tampil (tinggi layar berubah), gulir lagi halaman yang sedang diisi.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      const key = focusedPage.current;
      if (key) setTimeout(() => pageRefs.current[key]?.scrollToEnd({ animated: true }), 50);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      focusedPage.current = null;
    });
    return () => {
      sub.remove();
      hide.remove();
    };
  }, []);
  const insets = useSafeAreaInsets();
  // Tinggi area halaman tiket. ScrollView vertikal di dalam FlatList
  // horizontal tidak otomatis dibatasi tingginya (ikut tinggi konten) →
  // konten bawah terpotong & tidak bisa di-scroll. Batasi eksplisit.
  const [pageH, setPageH] = useState(0);
  useKeepPage(listRef, width, page);

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

  // ---- Simpan tiket ke galeri (hanya bentuk tiket, tanpa latar oranye) ----
  // Salinan tiket dirender di luar layar (tanpa tombol / slider, lekukan transparan)
  // lalu ditangkap sebagai PNG → galeri. Modul native sudah ada (dipakai kartu share).
  const snapRef = useRef<View>(null);
  const [snapItem, setSnapItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  async function onSaveImage(it: Item) {
    if (Platform.OS === 'web' || saving) return;
    setSaving(true);
    try {
      const ML = await import('expo-media-library');
      const perm = await ML.requestPermissionsAsync(true);
      if (!perm.granted) {
        showToast(t('sharecard.perm_denied'), 'error');
        return;
      }
      setSnapItem(it);
      // Tunggu salinan ter-render & gambar (sudah di-cache) termuat.
      await new Promise((r) => setTimeout(r, 700));
      const shot = await import('react-native-view-shot');
      if (!snapRef.current) throw new Error('snapshot-not-ready');
      const uri = await shot.captureRef(snapRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await ML.saveToLibraryAsync(uri);
      showToast(t('tiket.image_saved'), 'success');
    } catch {
      showToast(t('tiket.image_failed'), 'error');
    } finally {
      setSnapItem(null);
      setSaving(false);
    }
  }

  async function onCalendar(it: Item) {
    try {
      if (it.kind === 'event') {
        const times = ticketTimes(it.t.selfCheckin.opensAt, it.t.selfCheckin.closesAt, it.t.selfCheckin.startAt, it.t.selfCheckin.endAt);
        if (!times) throw new Error('no time');
        await addTicketToCalendar({ title: it.t.event.judul, ...times, location: it.t.event.lokasi ?? it.t.event.cabang?.nama });
      } else {
        const times = ticketTimes(it.r.selfCheckin?.opensAt, it.r.selfCheckin?.closesAt, it.r.selfCheckin?.startAt, it.r.selfCheckin?.endAt);
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
            mapsUrl: it.r.ibadah.mapsUrl ?? null,
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
            scrollEnabled={!swipeLocked}
            style={{ flex: 1 }}
            onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(x) => (x.kind === 'event' ? x.t.id : x.r.id)}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <ScrollView
                ref={(r) => {
                  pageRefs.current[item.kind === 'event' ? item.t.id : item.r.id] = r;
                }}
                automaticallyAdjustKeyboardInsets
                scrollEnabled={!swipeLocked}
                style={{ width, height: pageH || undefined }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (items.length > 1 ? 24 : insets.bottom + 32) + (Platform.OS === 'android' ? kbH : 0) }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {item.kind === 'event' ? (
                  <EventTicketCard
                    ticket={item.t}
                    variant="full"
                    notchColor={BG}
                    onCancelled={() => goBack(router, '/my-reservasi')}
                  />
                ) : (
                  <IbadahTicketCard
                    reservasi={item.r}
                    variant="full"
                    notchColor={BG}
                    onCancelled={() => goBack(router, '/my-reservasi')}
                  />
                )}
                {item.kind === 'event' && item.t.event.butuhKehadiran === false ? null : (
                  <Text className="text-white/90 text-[11px] text-center mt-3">{t('tiket.bright_hint')}</Text>
                )}
                {Platform.OS !== 'web' ? (
                  <Pressable
                    onPress={() => onSaveImage(item)}
                    disabled={saving}
                    className="mt-3 rounded-xl py-3 flex-row items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)', opacity: saving ? 0.6 : 1 }}
                    accessibilityRole="button"
                  >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Download size={15} color="#fff" />}
                    <Text className="text-white text-xs font-semibold">{t('tiket.save_image')}</Text>
                  </Pressable>
                ) : null}
                <View className="flex-row gap-2 mt-2">
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
                  {/* Event tanpa lokasi → tidak ada tombol Petunjuk arah. */}
                  {item.kind === 'event' && !hasEventLokasi(item.t.event) ? null : (
                    <Pressable
                      onPress={() => onDirections(item)}
                      className="flex-1 rounded-xl py-3 flex-row items-center justify-center gap-1.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                    >
                      <Map size={15} color="#fff" />
                      <Text className="text-white text-xs font-semibold">{t('tiket.directions')}</Text>
                    </Pressable>
                  )}
                </View>
                {item.kind === 'event' ? (
                  item.t.isSelf ? <TicketReviewCard kind="EVENT" ticketId={item.t.id} onInputFocus={() => scrollPageToEnd(item.t.id)} /> : null
                ) : !item.r.relation || item.r.relation === 'SELF' ? (
                  <TicketReviewCard kind="IBADAH" ticketId={item.r.id} onInputFocus={() => scrollPageToEnd(item.r.id)} />
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

      {/* Salinan tiket untuk "Simpan ke galeri" — di luar layar, tanpa latar oranye,
          tanpa tombol/slider; lekukan transparan. Hanya dirender saat menyimpan. */}
      {snapItem ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, width: width - 32 }}>
          <View ref={snapRef} collapsable={false} style={{ backgroundColor: 'transparent' }}>
            {snapItem.kind === 'event' ? (
              <EventTicketCard ticket={snapItem.t} variant="full" notchColor="transparent" snapshot onCancelled={() => {}} />
            ) : (
              <IbadahTicketCard reservasi={snapItem.r} variant="full" notchColor="transparent" snapshot onCancelled={() => {}} />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
