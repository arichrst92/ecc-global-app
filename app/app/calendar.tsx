import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Cake, Church, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useEventList } from '@/hooks/useEvents';
import { useMyFamily } from '@/hooks/useFamily';
import { listEvents } from '@/api/event';
import { getIbadahCalendar } from '@/api/ibadah';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { formatDate, parseLocalDate, toIsoDate } from '@/utils/date';

/**
 * Calendar screen — unified view dari Event + Ibadah + Birthday family
 * dalam grid bulan. Tap tanggal → modal list events hari itu.
 *
 * Data:
 * - useMonthlyEvents(year, month) — semua event di cabang user
 * - useMonthlyIbadah(year, month) — semua ibadah di cabang
 * - useMyFamily — birthday filtered dari tanggalLahir, recur tahunan
 *
 * Indicator dots di grid: emerald=event, amber=ibadah, pink=birthday.
 */

type DayItem =
  | { type: 'event'; id: string; title: string; date: string }
  | { type: 'ibadah'; id: string; title: string; date: string; time?: string; kategori?: string }
  | { type: 'birthday'; jemaatId: string; nama: string; age: number };

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const familyQuery = useMyFamily();
  const { viewingCabangId, branch } = useViewingBranch();
  const qc = useQueryClient();

  // Window per-bulan yang sedang dilihat — dipakai untuk scope event + ibadah
  // fetch. Ibadah pakai endpoint /admin/ibadah/calendar untuk dapat semua
  // OCCURRENCE dalam bulan yang aktif. Endpoint ini sudah expand recurring
  // (WEEKLY/BIWEEKLY/MONTHLY) jadi tanggal-tanggal aktual. Lebih akurat
  // daripada loop dari `tanggalMulai` master schedule (yang cuma tanggal
  // start, bukan hari recur).
  const monthStart = useMemo(() => toIsoDate(new Date(year, month, 1)), [year, month]);
  const monthEnd = useMemo(() => toIsoDate(new Date(year, month + 1, 0)), [year, month]);

  // Calendar-specific: include expired events + scope ke window bulan yang
  // sedang dilihat (per `docs/be-update-2026-09-02-event-window-and-ministry-schedule.md`
  // server-side from/to filter). Cache per-bulan via queryKey (lihat
  // useEventList) — klik prev/next month trigger fetch baru, tetap cepat
  // karena window kecil (1 bulan). Event tab list tetap pakai default
  // (upcoming only, today s/d today+90d).
  const eventsQuery = useEventList({ includeExpired: true, from: monthStart, to: monthEnd });
  const ibadahQuery = useQuery({
    queryKey: ['ibadah', 'calendar', monthStart, monthEnd, viewingCabangId ?? 'all'],
    queryFn: () => getIbadahCalendar({
      from: monthStart,
      to: monthEnd,
      cabangId: viewingCabangId ?? undefined,
    }),
    staleTime: 10 * 60_000,
  });

  // Prefetch prev + next month (event + ibadah) di background begitu bulan
  // aktif selesai load. Trade-off: 4 extra request per navigasi bulan, tapi
  // klik prev/next jadi instant (data sudah warm di cache) — user pattern
  // browse calendar sering ping-pong prev/next beberapa kali. queryKey harus
  // exact match sama useEventList (lihat src/hooks/useEvents.ts) dan ibadah
  // query di atas, supaya prefetch di-consume waktu useQuery jalan, bukan
  // jadi entry cache terpisah yang tidak pernah dipakai.
  const eventCabangId = viewingCabangId ?? branch?.id ?? 'all';
  useEffect(() => {
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevStart = toIsoDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1));
    const prevEnd = toIsoDate(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0));

    const nextMonthDate = new Date(year, month + 1, 1);
    const nextStart = toIsoDate(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1));
    const nextEnd = toIsoDate(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0));

    // Match queryKey structure dari useEventList (includeExpired: true → 'all-time')
    qc.prefetchQuery({
      queryKey: ['event', 'list', eventCabangId, 'all-time', prevStart, prevEnd],
      queryFn: () => listEvents({ from: prevStart, to: prevEnd, isPublished: true }),
      staleTime: 5 * 60_000,
    });
    qc.prefetchQuery({
      queryKey: ['event', 'list', eventCabangId, 'all-time', nextStart, nextEnd],
      queryFn: () => listEvents({ from: nextStart, to: nextEnd, isPublished: true }),
      staleTime: 5 * 60_000,
    });

    // Match queryKey ibadahQuery di atas
    qc.prefetchQuery({
      queryKey: ['ibadah', 'calendar', prevStart, prevEnd, viewingCabangId ?? 'all'],
      queryFn: () => getIbadahCalendar({ from: prevStart, to: prevEnd, cabangId: viewingCabangId ?? undefined }),
      staleTime: 10 * 60_000,
    });
    qc.prefetchQuery({
      queryKey: ['ibadah', 'calendar', nextStart, nextEnd, viewingCabangId ?? 'all'],
      queryFn: () => getIbadahCalendar({ from: nextStart, to: nextEnd, cabangId: viewingCabangId ?? undefined }),
      staleTime: 10 * 60_000,
    });
  }, [year, month, eventCabangId, viewingCabangId, qc]);

  // Aggregate loading/error/refetch state across ketiga queries — dipakai
  // untuk error banner + pull-to-refresh. Grid tetap dirender walau pending
  // (cuma dots yang bergantung data), jadi loading indicator kecil di header
  // saja — tidak block seluruh layout (konsisten dengan pattern ministry list
  // tapi lebih ringan karena grid punya value tanpa data juga).
  const isPending = eventsQuery.isPending || ibadahQuery.isPending || familyQuery.isPending;
  const isError = eventsQuery.isError || ibadahQuery.isError || familyQuery.isError;
  const isRefetching =
    eventsQuery.isRefetching || ibadahQuery.isRefetching || familyQuery.isRefetching;

  function refetchAll() {
    eventsQuery.refetch();
    ibadahQuery.refetch();
    familyQuery.refetch();
  }

  // Index items by day (1-31) — filter client-side ke month yang aktif
  const itemsByDay = useMemo(() => {
    const map = new Map<number, DayItem[]>();

    (eventsQuery.data ?? []).forEach((e) => {
      // Event multi-day: spread di semua tanggal dari tanggalMulai s/d tanggalSelesai.
      // Untuk single-day event, tanggalSelesai === tanggalMulai, jadi loop jalan 1x.
      // parseLocalDate: extract YYYY-MM-DD lalu construct di local TZ supaya
      // tanggal tidak shift karena UTC conversion.
      const start = parseLocalDate(e.tanggalMulai);
      const endRaw = e.tanggalSelesai
        ? parseLocalDate(e.tanggalSelesai)
        : parseLocalDate(e.tanggalMulai);
      // Safety: clamp ke max 60 hari supaya kalau BE salah set jangan freeze
      const MAX_DAYS = 60;
      let dayCount = 0;
      const cursor = new Date(start);
      while (cursor <= endRaw && dayCount < MAX_DAYS) {
        if (cursor.getFullYear() === year && cursor.getMonth() === month) {
          const day = cursor.getDate();
          if (!map.has(day)) map.set(day, []);
          map.get(day)!.push({
            type: 'event',
            id: e.id,
            title: e.judul,
            date: e.tanggalMulai,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
        dayCount += 1;
      }
    });

    // Ibadah: occurrence sudah expanded BE (recurring sudah jadi instances).
    // Setiap occurrence punya `tanggal` (YYYY-MM-DD), `ibadahId`, `nama`, `jamMulai`.
    (ibadahQuery.data ?? []).forEach((o) => {
      const d = parseLocalDate(o.tanggal);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({
          type: 'ibadah',
          id: o.ibadahId,
          title: o.nama,
          date: o.tanggal,
          time: o.jamMulai,
          kategori: o.kategoriIbadah?.nama,
        });
      }
    });

    // Family birthdays — repeat tahunan
    (familyQuery.data ?? []).forEach((rel) => {
      const tgl = rel.jemaat.tanggalLahir;
      if (!tgl) return;
      const birthDate = parseLocalDate(tgl);
      if (birthDate.getMonth() === month) {
        const day = birthDate.getDate();
        const age = year - birthDate.getFullYear();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({
          type: 'birthday',
          jemaatId: rel.jemaat.id,
          nama: rel.jemaat.namaLengkap,
          age,
        });
      }
    });

    return map;
  }, [year, month, eventsQuery.data, ibadahQuery.data, familyQuery.data]);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = firstDay.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Build 6-week grid (42 cells max)
  const cells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dayNames = lang === 'id'
    ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('calendar.title')}
          </Text>
          {isPending ? <ActivityIndicator size="small" color="#F97316" /> : null}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor="#F97316"
          />
        }
      >
        {/* Error banner — tampil kalau salah satu query gagal, tetap render
            grid di bawahnya (data yang berhasil load tetap ditampilkan). */}
        {isError ? (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex-row items-center gap-3">
            <Text className="text-xs text-red-600 flex-1">
              {t('error.generic')}
            </Text>
            <Pressable
              onPress={refetchAll}
              className="px-3 py-1.5 bg-red-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-xs">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Month nav */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={prevMonth}
            className="w-10 h-10 rounded-full bg-white border border-neutral-200 items-center justify-center"
          >
            <ChevronLeft size={18} color="#525252" />
          </Pressable>
          <Text className="text-lg font-bold text-neutral-900 capitalize">
            {monthName}
          </Text>
          <Pressable
            onPress={nextMonth}
            className="w-10 h-10 rounded-full bg-white border border-neutral-200 items-center justify-center"
          >
            <ChevronRight size={18} color="#525252" />
          </Pressable>
        </View>

        {/* Day name header */}
        <View className="flex-row mb-1">
          {dayNames.map((n) => (
            <View key={n} style={{ flex: 1 }} className="items-center py-1">
              <Text className="text-[10px] font-bold text-neutral-500 uppercase">
                {n}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View className="bg-white rounded-2xl p-2 border border-neutral-100">
          <View className="flex-row flex-wrap">
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={{ width: '14.2857%', aspectRatio: 1 }} />;
              }
              const items = itemsByDay.get(day) ?? [];
              const isToday = isCurrentMonth && day === today.getDate();
              const isSelected = selectedDay === day;
              const hasEvent = items.some((i) => i.type === 'event');
              const hasIbadah = items.some((i) => i.type === 'ibadah');
              const hasBirthday = items.some((i) => i.type === 'birthday');
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={{ width: '14.2857%', aspectRatio: 1 }}
                  className="p-0.5"
                >
                  <View
                    className={`flex-1 items-center justify-center rounded-xl ${
                      isSelected
                        ? 'bg-brand-500'
                        : isToday
                          ? 'bg-brand-50 border border-brand-300'
                          : ''
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected
                          ? 'text-white'
                          : isToday
                            ? 'text-brand-700'
                            : 'text-neutral-700'
                      }`}
                    >
                      {day}
                    </Text>
                    <View className="flex-row gap-0.5 mt-0.5">
                      {hasIbadah ? (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : '#D97706',
                          }}
                        />
                      ) : null}
                      {hasEvent ? (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : '#059669',
                          }}
                        />
                      ) : null}
                      {hasBirthday ? (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? '#fff' : '#EC4899',
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View className="flex-row gap-3 justify-center mt-3 mb-4">
          <LegendDot color="#D97706" label={t('calendar.legend_ibadah')} />
          <LegendDot color="#059669" label={t('calendar.legend_event')} />
          <LegendDot color="#EC4899" label={t('calendar.legend_birthday')} />
        </View>

        {/* Selected day items */}
        {selectedDay ? (
          <View>
            <Text className="text-sm font-bold text-neutral-900 mb-2">
              {selectedDay} {monthName}
            </Text>
            {selectedItems.length === 0 ? (
              <View className="bg-white rounded-2xl p-4 border border-neutral-100 items-center">
                <Text className="text-sm text-neutral-500">
                  {t('calendar.empty_day')}
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {(() => {
                  // Cek apakah selected day sebelum hari ini — untuk styling
                  // past events dimmed (opacity + muted color).
                  const selectedDate = new Date(year, month, selectedDay);
                  const startOfToday = new Date();
                  startOfToday.setHours(0, 0, 0, 0);
                  const isPastDay = selectedDate.getTime() < startOfToday.getTime();
                  return selectedItems.map((item, i) => {
                    // Stable composite key — include item ID + index supaya
                    // multiple ibadah pada day+time sama (mis. cabang yang
                    // sama jalankan 2 ibadah simultaneous di ruang berbeda)
                    // tidak collapse ke 1 render karena key collision.
                    const stableKey =
                      item.type === 'birthday'
                        ? `birthday-${item.jemaatId}-${i}`
                        : item.type === 'ibadah'
                          ? `ibadah-${item.id}-${item.time ?? ''}-${i}`
                          : `event-${item.id}-${i}`;
                    return (
                      <ItemRow
                        key={stableKey}
                        item={item}
                        isPast={isPastDay}
                        router={router}
                        t={t}
                        lang={lang}
                      />
                    );
                  });
                })()}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text className="text-xs text-neutral-600">{label}</Text>
    </View>
  );
}

function ItemRow({
  item,
  isPast,
  router,
  t,
  lang,
}: {
  item: DayItem;
  isPast: boolean;
  router: ReturnType<typeof useRouter>;
  t: (k: string, opts?: Record<string, unknown>) => string;
  lang: string;
}) {
  if (item.type === 'ibadah') {
    return (
      <Pressable
        onPress={() => router.push(`/ibadah/${item.id}?tanggal=${item.date}` as never)}
        className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
      >
        <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
          <Church size={18} color="#D97706" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start gap-2">
            <Text
              className="text-sm font-semibold text-neutral-900 flex-1"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.kategori ? (
              <View className="bg-brand-50 border border-brand-100 rounded-full px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                  {item.kategori}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {t('calendar.label_ibadah')}
            {item.time ? ` · ${item.time}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  }
  if (item.type === 'event') {
    return (
      <Pressable
        onPress={() => router.push(`/event/${item.id}`)}
        className={`bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100 ${
          isPast ? 'opacity-60' : ''
        }`}
      >
        <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
          <CalendarDays size={18} color="#059669" />
        </View>
        <View className="flex-1">
          <Text
            className={`text-sm font-semibold ${isPast ? 'text-neutral-500' : 'text-neutral-900'}`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text className="text-xs text-neutral-500">
            {t('calendar.label_event')} · {formatDate(item.date, lang)}
            {isPast ? ` · ${t('calendar.past_event')}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  }
  // birthday
  return (
    <View className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100">
      <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
        <Cake size={18} color="#EC4899" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
          {item.nama}
        </Text>
        <Text className="text-xs text-neutral-500">
          {t('calendar.birthday_age', { age: item.age })}
        </Text>
      </View>
    </View>
  );
}
