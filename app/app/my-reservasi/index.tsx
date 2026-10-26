/**
 * Reservasi Saya — tiket ibadah & event saya, anak, tanggungan, keluarga, dan tamu.
 *
 * - Segmen Ibadah | Event.
 * - Ibadah: tab Aktif (hari ini & mendatang + check-in < 24 jam) / Riwayat (100 terbaru).
 *   Anak yang belum dijemput tampil paling atas (kode jemput), auto-refresh 20 detik.
 * - Event : tab Mendatang / Riwayat (GET /admin/me/event-tiket).
 * - Satu tiket = satu orang; geser untuk check-in per tiket (kalau diizinkan).
 * - Ketuk tiket → tampilan penuh (/tiket) dengan QR besar.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, CalendarCheck, Church, Ticket } from 'lucide-react-native';

import { useMyReservasi } from '@/hooks/useMyReservasi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { listMyEventTickets, type TicketScope } from '@/api/tiket';
import { IbadahTicketCard } from '@/components/tiket/IbadahTicketCard';
import { EventTicketCard } from '@/components/tiket/EventTicketCard';
import { goBack } from '@/utils/nav';

type Seg = 'ibadah' | 'event';
type Tab = 'active' | 'history';

export default function MyReservasiScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ seg?: string }>();
  const [seg, setSeg] = useState<Seg>(params.seg === 'event' ? 'event' : 'ibadah');
  const [tab, setTab] = useState<Tab>('active');

  // ---- Ibadah
  const ibQ = useMyReservasi({ activeOnly: tab === 'active' }, { enabled: seg === 'ibadah' });
  const reservasi = ibQ.data ?? [];
  const kidsPending = reservasi.filter((r) => r.ibadah.isKidsIbadah && r.pickupCode && !r.pickedUpAt && r.status === 'JOIN');
  const others = reservasi.filter((r) => !kidsPending.includes(r));
  // Aktif: urut dari yang paling dekat; riwayat: terbaru dulu (sudah dari server).
  const othersSorted = tab === 'active' ? [...others].sort((a, b) => a.tanggalIbadah.localeCompare(b.tanggalIbadah)) : others;

  // ---- Event
  const scope: TicketScope = tab === 'active' ? 'upcoming' : 'history';
  const evQ = useQuery({
    queryKey: ['event-tiket', scope, null],
    queryFn: () => listMyEventTickets(scope),
    enabled: seg === 'event',
    staleTime: 30_000,
  });
  const tickets = evQ.data ?? [];

  const q = seg === 'ibadah' ? ibQ : evQ;
  usePolling(seg === 'ibadah' && tab === 'active' && kidsPending.length > 0, ibQ.refetch);
  useRefetchOnFocus(() => q.refetch());

  const empty = seg === 'ibadah' ? reservasi.length === 0 : tickets.length === 0;
  const tabLabel = (k: Tab) =>
    seg === 'ibadah'
      ? t(k === 'active' ? 'my_reservasi.tab_active' : 'my_reservasi.tab_history')
      : t(k === 'active' ? 'tiket.tab_upcoming' : 'tiket.tab_history');

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('my_reservasi.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('my_reservasi.subtitle')}</Text>
          </View>
        </View>
        {/* Segmen Ibadah | Event */}
        <View className="mx-4 flex-row bg-neutral-100 rounded-xl p-1">
          {(['ibadah', 'event'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                setSeg(k);
                setTab('active');
              }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-1.5 rounded-lg ${seg === k ? 'bg-white' : ''}`}
            >
              {k === 'ibadah' ? (
                <Church size={14} color={seg === k ? '#EA580C' : '#525252'} />
              ) : (
                <Ticket size={14} color={seg === k ? '#EA580C' : '#525252'} />
              )}
              <Text className={`text-xs font-semibold ${seg === k ? 'text-brand-600' : 'text-neutral-600'}`}>
                {t(k === 'ibadah' ? 'tiket.seg_ibadah' : 'tiket.seg_event')}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row px-4 py-2 gap-2">
          {(['active', 'history'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              className={`px-4 py-1.5 rounded-full ${tab === k ? 'bg-brand-500' : 'bg-neutral-100'}`}
            >
              <Text className={`text-xs font-semibold ${tab === k ? 'text-white' : 'text-neutral-700'}`}>{tabLabel(k)}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : q.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable onPress={() => q.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : empty ? (
          <View className="items-center py-16 px-8">
            <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              {seg === 'ibadah' ? <CalendarCheck size={28} color="#A3A3A3" /> : <Ticket size={28} color="#A3A3A3" />}
            </View>
            <Text className="text-sm font-bold text-neutral-900 text-center mb-1">
              {seg === 'ibadah'
                ? t(tab === 'active' ? 'my_reservasi.empty_title' : 'my_reservasi.empty_history_title')
                : tab === 'active'
                  ? t('tiket.empty_event_title')
                  : t('tiket.empty_event_history')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center">
              {seg === 'ibadah'
                ? t(tab === 'active' ? 'my_reservasi.empty_body' : 'my_reservasi.empty_history_body')
                : tab === 'active'
                  ? t('tiket.empty_event_body')
                  : ''}
            </Text>
          </View>
        ) : seg === 'ibadah' ? (
          <>
            {kidsPending.length > 0 ? (
              <View className="gap-3 mb-6">
                <View className="flex-row items-center gap-2">
                  <Baby size={16} color="#F97316" />
                  <Text className="text-xs font-bold text-brand-700 uppercase">{t('my_reservasi.kids_section')}</Text>
                </View>
                {kidsPending.map((r) => (
                  <IbadahTicketCard
                    key={r.id}
                    reservasi={r}
                    onPress={() =>
                      router.push(`/tiket?kind=ibadah&id=${r.id}&ibadahId=${r.ibadah.id}&tanggal=${r.tanggalIbadah.slice(0, 10)}` as never)
                    }
                  />
                ))}
              </View>
            ) : null}
            {othersSorted.length > 0 ? (
              <View className="gap-3">
                <Text className="text-xs font-bold text-neutral-500 uppercase">{t('my_reservasi.other_section')}</Text>
                {othersSorted.map((r) => (
                  <IbadahTicketCard
                    key={r.id}
                    reservasi={r}
                    onPress={() =>
                      router.push(`/tiket?kind=ibadah&id=${r.id}&ibadahId=${r.ibadah.id}&tanggal=${r.tanggalIbadah.slice(0, 10)}` as never)
                    }
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View className="gap-3">
            {tickets.map((tk) => (
              <EventTicketCard
                key={tk.id}
                ticket={tk}
                onPress={() => router.push(`/tiket?kind=event&id=${tk.id}&eventId=${tk.event.id}&scope=${scope}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function usePolling(enabled: boolean, refetch: () => unknown) {
  const ref = useRef(refetch);
  ref.current = refetch;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => ref.current(), 20_000);
    return () => clearInterval(id);
  }, [enabled]);
}
