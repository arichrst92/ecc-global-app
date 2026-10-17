/**
 * Jadwal Pelayanan Saya — jadwal melayani (roster ibadah + petugas event)
 * beserta peran saya, rekan sepelayanan, dan catatan.
 * Tab: Mendatang (hari ini s.d. 60 hari) · Riwayat (90 hari terakhir).
 * API: GET /admin/me/ministry-schedule?from&to → { assignments, events }
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Church, Clock, HeartHandshake, MapPin, ScanLine, StickyNote, Ticket, Users } from 'lucide-react-native';

import { getMyServiceSchedule } from '@/api/ministry';
import type { MyEventDuty, MyMinistryAssignment } from '@/types/ministrySchedule';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useVenueTz } from '@/hooks/useVenueTz';
import { addDaysIso, formatDateWithDay, todayIso } from '@/utils/date';
import { formatVenueRange } from '@/utils/time';
import { goBack } from '@/utils/nav';

type Tab = 'upcoming' | 'history';

type Item =
  | { kind: 'ibadah'; date: string; a: MyMinistryAssignment }
  | { kind: 'event'; date: string; e: MyEventDuty };

export default function MyServiceScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upcoming');
  const venueTz = useVenueTz();

  const range = tab === 'upcoming' ? { from: todayIso(), to: addDaysIso(60) } : { from: addDaysIso(-90), to: addDaysIso(-1) };
  const q = useQuery({
    queryKey: ['me', 'service-schedule', tab],
    queryFn: () => getMyServiceSchedule(range.from, range.to),
  });
  useRefetchOnFocus(() => q.refetch());

  // Gabung roster ibadah + event, kelompokkan per tanggal.
  const groups = useMemo(() => {
    const items: Item[] = [
      ...(q.data?.assignments ?? []).map((a) => ({ kind: 'ibadah' as const, date: a.tanggal.slice(0, 10), a })),
      ...(q.data?.events ?? []).map((e) => ({ kind: 'event' as const, date: e.tanggalMulai.slice(0, 10), e })),
    ];
    items.sort((x, y) => (tab === 'upcoming' ? x.date.localeCompare(y.date) : y.date.localeCompare(x.date)));
    const map = new Map<string, Item[]>();
    for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
    return [...map.entries()];
  }, [q.data, tab]);
  const total = groups.reduce((n, [, xs]) => n + xs.length, 0);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('service.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('service.subtitle')}</Text>
          </View>
        </View>
        <View className="flex-row px-4 pb-2 gap-2">
          {(['upcoming', 'history'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              className={`px-4 py-1.5 rounded-full ${tab === k ? 'bg-brand-500' : 'bg-neutral-100'}`}
            >
              <Text className={`text-xs font-semibold ${tab === k ? 'text-white' : 'text-neutral-700'}`}>
                {t(k === 'upcoming' ? 'service.tab_upcoming' : 'service.tab_history')}
              </Text>
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
          <View className="py-16 items-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : q.isError ? (
          <View className="py-16 items-center">
            <Text className="text-sm text-red-600 mb-2">{t('error.generic')}</Text>
            <Pressable onPress={() => q.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : total === 0 ? (
          <View className="py-16 items-center px-6">
            <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <HeartHandshake size={28} color="#EA580C" />
            </View>
            <Text className="text-sm font-bold text-neutral-900 text-center mb-1">
              {t(tab === 'upcoming' ? 'service.empty_title' : 'service.empty_history')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center">{t('service.empty_body')}</Text>
          </View>
        ) : (
          <>
            <Text className="text-xs text-neutral-500 mb-3">{t('service.count', { count: total })}</Text>
            {groups.map(([date, items]) => (
              <View key={date} className="mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <CalendarDays size={14} color="#EA580C" />
                  <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                    {date === todayIso() ? `${t('common.today')} · ` : ''}
                    {formatDateWithDay(date, i18n.language)}
                  </Text>
                </View>
                <View className="gap-2">
                  {items.map((it) =>
                    it.kind === 'ibadah' ? (
                      <IbadahDuty key={`i-${it.a.id}`} a={it.a} tz={venueTz} onPress={() => router.push(`/ibadah/${it.a.ibadahId}?tanggal=${String(it.a.tanggal).slice(0, 10)}` as never)} />
                    ) : (
                      <EventDuty key={`e-${it.e.id}`} e={it.e} onPress={() => router.push(`/event/${it.e.eventId}` as never)} />
                    ),
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RoleBadge({ posisi, ministry }: { posisi: string; ministry: string }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1.5 mt-2">
      <View className="bg-brand-500 px-2.5 py-1 rounded-full">
        <Text className="text-[11px] font-bold text-white">{posisi}</Text>
      </View>
      <View className="bg-brand-50 px-2.5 py-1 rounded-full">
        <Text className="text-[11px] font-semibold text-brand-700">{ministry}</Text>
      </View>
    </View>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2 mt-1.5">
      <View style={{ marginTop: 1 }}>{icon}</View>
      <Text className="flex-1 text-xs text-neutral-600">{text}</Text>
    </View>
  );
}

function IbadahDuty({ a, tz, onPress }: { a: MyMinistryAssignment; tz: string; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl border border-neutral-100 p-4 active:opacity-90">
      <View className="flex-row items-center gap-2">
        <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center">
          <Church size={18} color="#EA580C" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] text-neutral-500">
            {t('service.kind_ibadah')}
            {a.source === 'TIM_IBADAH' ? ` · ${t('service.team_default')}` : ''}
          </Text>
          <Text className="text-sm font-bold text-neutral-900">{a.ibadahNama}</Text>
        </View>
      </View>
      <RoleBadge posisi={a.posisi} ministry={a.ministryNama} />
      {a.ibadahJamMulai ? (
        <Row
          icon={<Clock size={13} color="#737373" />}
          text={formatVenueRange(a.tanggal, a.ibadahJamMulai, a.ibadahJamSelesai, tz)}
        />
      ) : null}
      {a.ibadahLokasi ? <Row icon={<MapPin size={13} color="#737373" />} text={a.ibadahLokasi} /> : null}
      {a.notes ? <Row icon={<StickyNote size={13} color="#737373" />} text={a.notes} /> : null}
      {a.coServants.length > 0 ? (
        <Row
          icon={<Users size={13} color="#737373" />}
          text={`${t('service.with')}: ${a.coServants.map((c) => `${c.namaLengkap} (${c.posisi})`).join(', ')}`}
        />
      ) : null}
    </Pressable>
  );
}

function EventDuty({ e, onPress }: { e: MyEventDuty; onPress: () => void }) {
  const { t } = useTranslation();
  const tz = useVenueTz(e.cabang?.id, e.cabang?.timezone ?? null);
  return (
    <Pressable onPress={onPress} className="bg-white rounded-2xl border border-neutral-100 p-4 active:opacity-90">
      <View className="flex-row items-center gap-2">
        <View className="w-9 h-9 rounded-xl bg-violet-50 items-center justify-center">
          <Ticket size={18} color="#7C3AED" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] text-neutral-500">{t('service.kind_event')}</Text>
          <Text className="text-sm font-bold text-neutral-900">{e.judul}</Text>
        </View>
      </View>
      <RoleBadge posisi={e.posisi} ministry={e.ministryNama} />
      {e.jamMulai ? (
        <Row icon={<Clock size={13} color="#737373" />} text={formatVenueRange(e.tanggalMulai, e.jamMulai, e.jamSelesai, tz)} />
      ) : null}
      {e.lokasi ? <Row icon={<MapPin size={13} color="#737373" />} text={e.lokasi} /> : null}
      {e.canScanAttendance ? <Row icon={<ScanLine size={13} color="#059669" />} text={t('service.scanner')} /> : null}
      {e.catatan ? <Row icon={<StickyNote size={13} color="#737373" />} text={e.catatan} /> : null}
    </Pressable>
  );
}
