import { useMemo, useState } from 'react';
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
import { CalendarDays, ChevronsUpDown, MapPin, Users } from 'lucide-react-native';

import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { GuestEventView } from '@/components/guest/GuestEventView';
import { HeroImage } from '@/components/ui/HeroImage';
import { useAuthStore } from '@/stores/auth.store';
import { useEventList } from '@/hooks/useEvents';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import type { EventListItem, TipeBayar } from '@/types/event';
import { formatDate } from '@/utils/date';

type Filter = 'all' | 'GRATIS' | 'PAID';

function priceLabel(e: EventListItem, t: (k: string) => string, lang: string): string {
  if (e.tipeBayar === 'GRATIS') return t('event.free');
  if (e.tipeBayar === 'NOMINAL_BEBAS') return lang === 'id' ? 'Persembahan' : 'Donation';
  // NOMINAL_TETAP — format Rp Nrb
  const num = Number(e.nominal);
  if (num >= 1000) return `Rp ${(num / 1000).toLocaleString('id-ID')}rb`;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function heroEmoji(_e: EventListItem): string {
  // BE belum kasih emoji. Heuristic dari tags.
  const tags = (_e as { tags?: string[] }).tags ?? [];
  if (tags.includes('youth') || tags.includes('retreat')) return '⛰️';
  if (tags.includes('family') || tags.includes('kkr')) return '🏠';
  if (tags.includes('building') || tags.includes('fundraising')) return '🏗️';
  if (tags.includes('discipleship') || tags.includes('prayer')) return '🙏';
  if (tags.includes('fellowship') || tags.includes('professional')) return '🤝';
  return '🎉';
}

export default function EventListScreen() {
  // Guard di luar — rules-of-hooks safe. Guest pakai /public/event (no RSVP).
  const isGuest = useAuthStore((s) => s.isGuest);
  if (isGuest) {
    return <GuestEventView />;
  }
  return <EventListAuthenticated />;
}

function EventListAuthenticated() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { branch, isHome, isLoading: branchLoading } = useViewingBranch();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const query = useEventList();

  const filtered = useMemo(() => {
    const all = query.data ?? [];
    if (filter === 'all') return all;
    if (filter === 'GRATIS') return all.filter((e) => e.tipeBayar === 'GRATIS');
    return all.filter((e) => e.tipeBayar !== 'GRATIS');
  }, [query.data, filter]);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-5 py-3 flex-row items-center gap-3">
          <CalendarDays size={20} color="#171717" />
          <View className="flex-1">
            <Text className="text-lg font-bold text-neutral-900">{t('event.title')}</Text>
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
          <Pressable
            onPress={() => setSwitcherOpen(true)}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronsUpDown size={18} color="#EA580C" />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}
        >
          {(
            [
              { id: 'all', label: t('event.filter_all') },
              { id: 'GRATIS', label: t('event.free') },
              { id: 'PAID', label: t('event.paid') },
            ] as Array<{ id: Filter; label: string }>
          ).map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full ${
                filter === f.id ? 'bg-brand-500' : 'bg-neutral-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  filter === f.id ? 'text-white' : 'text-neutral-600'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ViewingBanner />

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
        {query.isPending || branchLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={filter !== 'all'} />
        ) : (
          <View className="gap-3">
            {filtered.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                emoji={heroEmoji(e)}
                priceText={priceLabel(e, t, lang)}
                lang={lang}
                onPress={() => router.push(`/event/${e.slug || e.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BranchSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

function EventCard({
  event,
  emoji,
  priceText,
  lang,
  onPress,
}: {
  event: EventListItem;
  emoji: string;
  priceText: string;
  lang: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const quotaPercent = event.quotaPeserta
    ? Math.round((event.pesertaCount / event.quotaPeserta) * 100)
    : 0;
  const isFull = event.quotaPeserta != null && event.pesertaCount >= event.quotaPeserta;
  const isFree = event.tipeBayar === 'GRATIS';

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden border border-neutral-100"
    >
      {/* Hero block — fit-to-width, tinggi proporsional sesuai aspect rasio image */}
      <View className="relative">
        <HeroImage url={event.heroImageUrl} fallbackEmoji={emoji} fitToWidth />
        <View
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full ${
            isFree ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        >
          <Text className="text-xs text-white font-semibold">{priceText}</Text>
        </View>
        {isFull ? (
          <View className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-500">
            <Text className="text-xs text-white font-semibold">{t('event.quota_full')}</Text>
          </View>
        ) : null}
      </View>

      <View className="p-4">
        <Text className="text-xs text-neutral-500 mb-1" numberOfLines={1}>
          {formatDate(event.tanggalMulai, lang)}
          {event.tanggalSelesai !== event.tanggalMulai
            ? ` - ${formatDate(event.tanggalSelesai, lang)}`
            : ''}
        </Text>
        <Text className="font-bold text-neutral-900 mb-1.5" numberOfLines={2}>
          {event.judul}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={2}>
          {event.ringkasan}
        </Text>

        {event.lokasi && event.lokasi.trim().length > 0 ? (
          <View className="flex-row items-center gap-1 mt-2">
            <MapPin size={12} color="#A3A3A3" />
            <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
              {event.lokasi}
            </Text>
          </View>
        ) : null}

        {/* Quota progress */}
        {event.quotaPeserta ? (
          <View className="mt-3 flex-row items-center gap-2">
            <View className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${quotaPercent > 80 ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(100, quotaPercent)}%` }}
              />
            </View>
            <Text className="text-xs text-neutral-500 font-medium">
              {event.pesertaCount}/{event.quotaPeserta}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 mt-2">
            <Users size={12} color="#A3A3A3" />
            <Text className="text-xs text-brand-600 font-semibold">
              {t('event.participants_count', { count: event.pesertaCount })}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
      <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
        <CalendarDays size={28} color="#A3A3A3" />
      </View>
      <Text className="text-lg font-semibold text-neutral-700">
        {filtered ? t('event.empty_filter_title') : t('event.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1">
        {filtered ? t('event.empty_filter_msg') : t('event.empty_msg')}
      </Text>
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
