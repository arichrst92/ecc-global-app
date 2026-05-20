import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Church, ChevronRight } from 'lucide-react-native';

import { getIbadahCalendar } from '@/api/ibadah';
import { todayIso, addDaysIso, formatDateWithDay, groupByDate, isToday } from '@/utils/date';
import { useTranslation as useI18n } from 'react-i18next';

const DEFAULT_RANGE_DAYS = 30; // Tampilkan 30 hari ke depan

export default function IbadahListScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const from = todayIso();
  const to = addDaysIso(DEFAULT_RANGE_DAYS);

  const query = useQuery({
    queryKey: ['ibadah', 'calendar', from, to],
    queryFn: () => getIbadahCalendar({ from, to }),
    staleTime: 10 * 60_000,
  });

  const grouped = groupByDate(query.data ?? []);
  const dates = Object.keys(grouped).sort();

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-5 py-4 flex-row items-center gap-3">
          <Calendar size={20} color="#171717" />
          <Text className="text-lg font-bold text-neutral-900 flex-1">{t('ibadah.title')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
            <Text className="text-sm text-neutral-500 mt-2">{t('common.loading')}</Text>
          </View>
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : dates.length === 0 ? (
          <EmptyState />
        ) : (
          dates.map((date) => (
            <DateSection
              key={date}
              date={date}
              items={grouped[date]}
              onTapItem={(ibadahId) => router.push(`/ibadah/${ibadahId}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function DateSection({
  date,
  items,
  onTapItem,
}: {
  date: string;
  items: { ibadahId: string; nama: string; jamMulai: string; jamSelesai: string; lokasi: string; kategoriIbadah?: { nama: string } | null }[];
  onTapItem: (id: string) => void;
}) {
  const { i18n } = useI18n();
  const lang = i18n.language;
  const today = isToday(date);

  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-2">
        <Text className={`text-xs font-bold uppercase tracking-wider ${today ? 'text-brand-600' : 'text-neutral-500'}`}>
          {today ? 'HARI INI' : ''} {formatDateWithDay(date, lang)}
        </Text>
        <View className="flex-1 h-px bg-neutral-200" />
      </View>
      <View className="gap-2">
        {items.map((item) => (
          <Pressable
            key={`${item.ibadahId}-${date}`}
            onPress={() => onTapItem(item.ibadahId)}
            className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
          >
            <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
              <Text className="text-xs text-brand-600 font-bold">
                {item.jamMulai.split(':')[0]}
              </Text>
              <Text className="text-[10px] text-brand-500">{item.jamMulai.split(':')[1]}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900" numberOfLines={1}>
                {item.nama}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                {item.kategoriIbadah?.nama ? `${item.kategoriIbadah.nama} · ` : ''}
                {item.lokasi}
              </Text>
              <Text className="text-xs text-neutral-400 mt-1">
                {item.jamMulai} - {item.jamSelesai}
              </Text>
            </View>
            <ChevronRight size={16} color="#A3A3A3" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
      <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
        <Church size={28} color="#A3A3A3" />
      </View>
      <Text className="text-lg font-semibold text-neutral-700">{t('ibadah.empty_title')}</Text>
      <Text className="text-sm text-neutral-500 text-center mt-1">{t('ibadah.empty_msg')}</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
      <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
      <Pressable onPress={onRetry} className="px-4 py-2 bg-brand-500 rounded-lg">
        <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
