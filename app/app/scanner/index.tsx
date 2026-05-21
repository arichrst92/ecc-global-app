import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Church,
  Clock,
  MapPin,
  ScanLine,
} from 'lucide-react-native';

import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';
import { formatDate, todayIso } from '@/utils/date';

export default function ScannerPickerScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();

  const eventsQuery = useScannerEvents();
  const ibadahQuery = useScannerIbadah();

  const isRefreshing = eventsQuery.isRefetching || ibadahQuery.isRefetching;
  const isLoading = eventsQuery.isPending || ibadahQuery.isPending;

  function refresh() {
    eventsQuery.refetch();
    ibadahQuery.refetch();
  }

  const events = eventsQuery.data ?? [];
  const ibadah = ibadahQuery.data ?? [];

  // Filter: today + upcoming (event) atau aktif (ibadah)
  const today = todayIso();
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.tanggalSelesai >= today),
    [events, today],
  );

  const isEmpty = upcomingEvents.length === 0 && ibadah.length === 0;

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
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">
              {t('scanner.title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('scanner.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : isEmpty ? (
          <View className="items-center py-16 px-8">
            <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <ScanLine size={32} color="#A3A3A3" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700 text-center">
              {t('scanner.empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('scanner.empty_msg')}
            </Text>
          </View>
        ) : (
          <>
            {ibadah.length > 0 ? (
              <Section title={t('scanner.section_ibadah')}>
                <View className="gap-2">
                  {ibadah.map((i) => (
                    <IbadahCard
                      key={i.ibadahId}
                      item={i}
                      onPress={() =>
                        router.push(`/scanner/ibadah/${i.ibadahId}?tanggal=${today}`)
                      }
                    />
                  ))}
                </View>
              </Section>
            ) : null}

            {upcomingEvents.length > 0 ? (
              <Section title={t('scanner.section_event')}>
                <View className="gap-2">
                  {upcomingEvents.map((e) => (
                    <EventCard
                      key={e.eventId}
                      item={e}
                      lang={lang}
                      onPress={() => router.push(`/scanner/event/${e.eventId}`)}
                    />
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {title}
      </Text>
      {children}
    </View>
  );
}

function IbadahCard({
  item,
  onPress,
}: {
  item: { ibadahId: string; nama: string; jamMulai: string; jamSelesai: string; lokasi: string; pelayananNama: string; role: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-12 h-12 rounded-xl bg-brand-100 items-center justify-center">
        <Church size={20} color="#EA580C" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-bold text-neutral-900" numberOfLines={1}>
          {item.nama}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Clock size={12} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500">
            {item.jamMulai} - {item.jamSelesai}
          </Text>
          <Text className="text-xs text-neutral-400">·</Text>
          <MapPin size={12} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
            {item.lokasi}
          </Text>
        </View>
        <View className="bg-brand-50 self-start px-2 py-0.5 rounded-full mt-1">
          <Text className="text-[10px] font-bold text-brand-700">
            {item.pelayananNama} · {item.role}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}

function EventCard({
  item,
  lang,
  onPress,
}: {
  item: { eventId: string; judul: string; tanggalMulai: string; tanggalSelesai: string; lokasi: string; pelayananNama: string; role: string };
  lang: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-12 h-12 rounded-xl bg-amber-100 items-center justify-center">
        <CalendarDays size={20} color="#D97706" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-bold text-neutral-900" numberOfLines={1}>
          {item.judul}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Clock size={12} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500">
            {formatDate(item.tanggalMulai, lang)}
          </Text>
          <Text className="text-xs text-neutral-400">·</Text>
          <MapPin size={12} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
            {item.lokasi}
          </Text>
        </View>
        <View className="bg-amber-50 self-start px-2 py-0.5 rounded-full mt-1">
          <Text className="text-[10px] font-bold text-amber-700">
            {item.pelayananNama} · {item.role}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
