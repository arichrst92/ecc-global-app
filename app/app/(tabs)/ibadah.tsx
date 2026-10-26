import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useVenueTz } from '@/hooks/useVenueTz';
import { formatVenueRange, venueToLocal } from '@/utils/time';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Church, ChevronRight, ChevronsUpDown, RefreshCw, Ticket } from 'lucide-react-native';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { NotificationBell } from '@/components/NotificationBell';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { GuestIbadahView } from '@/components/guest/GuestIbadahView';
import { getIbadahCalendar } from '@/api/ibadah';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { todayIso, addDaysIso, formatDateWithDay, groupByDate, isToday } from '@/utils/date';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

const DEFAULT_RANGE_DAYS = 30; // Tampilkan 30 hari ke depan

export default function IbadahListScreen() {
  // Guard di luar — rules-of-hooks safe. Guest pakai /public/ibadah/calendar
  // endpoint (read-only, no check-in button).
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) {
    return <GuestIbadahView />;
  }
  return <IbadahListAuthenticated />;
}

function IbadahListAuthenticated() {
  const { t } = useTranslation();
  const router = useRouter();
  const { branch, viewingCabangId, isHome, isLoading } = useViewingBranch();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const from = todayIso();
  const to = addDaysIso(DEFAULT_RANGE_DAYS);

  const query = useQuery({
    queryKey: ['ibadah', 'calendar', from, to, viewingCabangId ?? 'all'],
    queryFn: () => getIbadahCalendar({ from, to, cabangId: viewingCabangId ?? undefined }),
    enabled: !isLoading,
    // Cache dipersist ke storage — selalu ambil ulang saat layar dibuka supaya
    // ibadah yang baru dibuat/diubah (termasuk hari ini) langsung muncul.
    staleTime: 60_000,
    refetchOnMount: 'always',
  });
  useRefetchOnFocus(() => query.refetch(), !isLoading);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  async function refreshNow() {
    setManualRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setManualRefreshing(false);
    }
  }

  const grouped = groupByDate(query.data ?? []);
  const dates = Object.keys(grouped).sort();

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-5 py-3 flex-row items-center gap-3">
          <Calendar size={20} color={nc('#171717')} />
          <View className="flex-1">
            <Text className="text-lg font-bold text-neutral-900">{t('ibadah.title')}</Text>
            {branch ? (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {branch.nama}
                </Text>
                {!isHome ? (
                  <View className="bg-amber-100 px-1.5 py-0.5 rounded-full">
                    <Text className="text-[9px] font-bold text-amber-700">VIEW</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          {Platform.OS === 'web' ? (
            <Pressable onPress={refreshNow} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.refresh')}>
              {manualRefreshing || query.isFetching ? (
                <ActivityIndicator size="small" color="#EA580C" />
              ) : (
                <RefreshCw size={18} color="#EA580C" />
              )}
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push('/my-reservasi' as never)}
            className="w-10 h-10 items-center justify-center"
            accessibilityLabel={t('ibadah.my_reservations') ?? 'Reservasi Saya'}
          >
            <Ticket size={18} color="#EA580C" />
          </Pressable>
          <Pressable
            onPress={() => setSwitcherOpen(true)}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronsUpDown size={18} color="#EA580C" />
          </Pressable>
          <NotificationBell variant="dark" badgeBorderColor="#FFFFFF" />
        </View>
      </SafeAreaView>

      <ViewingBanner />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={refreshNow} tintColor="#F97316" />
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
              onTapItem={(ibadahId) =>
                router.push(`/ibadah/${ibadahId}?tanggal=${date}` as never)
              }
            />
          ))
        )}
      </ScrollView>

      <BranchSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
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
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const today = isToday(date);
  // Jam jadwal (zona cabang yang dilihat) → zona waktu HP.
  const venueTz = useVenueTz();

  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-2">
        <Text className={`text-xs font-bold uppercase tracking-wider ${today ? 'text-brand-600' : 'text-neutral-500'}`}>
          {today ? 'HARI INI' : ''} {formatDateWithDay(date, lang)}
        </Text>
        <View className="flex-1 h-px bg-neutral-200" />
      </View>
      <View className="gap-2">
        {items.map((item) => {
          const start = venueToLocal(date, item.jamMulai, venueTz);
          const [hh, mm] = (start?.time ?? item.jamMulai).split(':');
          return (
          <Pressable
            key={`${item.ibadahId}-${date}`}
            onPress={() => onTapItem(item.ibadahId)}
            className="bg-card rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
          >
            <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
              <Text className="text-xs text-brand-600 font-bold">{hh}</Text>
              <Text className="text-[10px] text-brand-500">{mm}</Text>
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
                {formatVenueRange(date, item.jamMulai, item.jamSelesai, venueTz)}
              </Text>
            </View>
            <ChevronRight size={16} color={nc('#A3A3A3')} />
          </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
      <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
        <Church size={28} color={nc('#A3A3A3')} />
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
      <Pressable onPress={onRetry} {...gx('px-4 py-2 bg-brand-500 rounded-lg')}>
        <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
