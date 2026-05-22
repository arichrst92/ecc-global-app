/**
 * Local Market public browse — per BE handoff doc 2026-05-22 (rev a).
 *
 * Default: bisnis di cabang home user, filter chip All/Online/Offline,
 * search bar. Card grid 2-column dengan hero + logo overlay.
 * Tap card → /market/[id] public detail.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, Store, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { useLocalMarket } from '@/hooks/useLocalBusiness';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { env } from '@/config/env';
import type { LocalBusiness } from '@/types/localBusiness';

type OnlineFilter = 'all' | 'online' | 'offline';

export default function LocalMarketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { viewingCabangId } = useViewingBranch();
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search 300ms
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const query = useLocalMarket({
    cabangId: viewingCabangId ?? undefined,
    isOnline:
      onlineFilter === 'all' ? undefined : onlineFilter === 'online',
    search: debouncedSearch || undefined,
  });

  const items = useMemo<LocalBusiness[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((p) => p.data);
  }, [query.data]);

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
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('market.title')}
          </Text>
        </View>

        {/* Search bar */}
        <View className="px-4 pb-2">
          <View className="bg-neutral-100 rounded-xl flex-row items-center px-3 gap-2">
            <Search size={16} color="#737373" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('market.search_placeholder')}
              className="flex-1 py-2.5 text-sm text-neutral-900"
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} className="p-1">
                <X size={14} color="#737373" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Filter chips */}
        <View className="flex-row px-4 pb-2 gap-2">
          <FilterChip
            label={t('market.filter_all')}
            active={onlineFilter === 'all'}
            onPress={() => setOnlineFilter('all')}
          />
          <FilterChip
            label={t('market.filter_online')}
            active={onlineFilter === 'online'}
            onPress={() => setOnlineFilter('online')}
          />
          <FilterChip
            label={t('market.filter_offline')}
            active={onlineFilter === 'offline'}
            onPress={() => setOnlineFilter('offline')}
          />
        </View>
      </SafeAreaView>

      {query.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState onSeeAll={() => setOnlineFilter('all')} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#F97316"
            />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <BusinessCard
              business={item}
              onPress={() => router.push(`/market/${item.id}` as never)}
            />
          )}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full ${active ? 'bg-brand-500' : 'bg-neutral-100'}`}
    >
      <Text
        className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BusinessCard({
  business,
  onPress,
}: {
  business: LocalBusiness;
  onPress: () => void;
}) {
  const tipeColor =
    business.tipeBisnis === 'B2C'
      ? 'bg-emerald-100 text-emerald-700'
      : business.tipeBisnis === 'B2B'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-violet-100 text-violet-700';
  const [tipeBg, tipeText] = tipeColor.split(' ');

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-white rounded-2xl border border-neutral-100 overflow-hidden"
    >
      <View className="relative">
        <HeroImage
          url={business.heroImageUrl}
          fallbackEmoji="🏪"
          emojiSize={36}
          className="w-full aspect-square"
        />
        {/* Logo overlay (kalau ada) */}
        {business.logoUrl ? (
          <View className="absolute bottom-2 left-2 w-10 h-10 rounded-xl bg-white items-center justify-center overflow-hidden border-2 border-white">
            <Image
              source={{
                uri: business.logoUrl.startsWith('http')
                  ? business.logoUrl
                  : `${env.apiBaseUrl}${business.logoUrl}`,
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ) : null}
        <View
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full ${tipeBg}`}
        >
          <Text className={`text-[9px] font-bold ${tipeText}`}>
            {business.tipeBisnis}
          </Text>
        </View>
      </View>
      <View className="p-3">
        <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
          {business.nama}
        </Text>
        {business.industri ? (
          <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
            {business.industri}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-neutral-100">
          <Avatar
            name={business.owner.namaLengkap}
            fotoUrl={business.owner.fotoUrl ?? undefined}
            size={16}
          />
          <Text className="text-[10px] text-neutral-500 flex-1" numberOfLines={1}>
            {business.owner.namaLengkap}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ onSeeAll }: { onSeeAll: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
        <Store size={36} color="#A3A3A3" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 text-center">
        {t('market.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4 leading-relaxed">
        {t('market.empty_msg')}
      </Text>
      <Pressable onPress={onSeeAll} className="bg-brand-500 rounded-full px-4 py-2">
        <Text className="text-sm font-bold text-white">{t('market.reset_filter')}</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-sm text-red-600 text-center mb-3">
        {t('error.generic')}
      </Text>
      <Pressable onPress={onRetry} className="bg-brand-500 rounded-full px-4 py-2">
        <Text className="text-sm font-bold text-white">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

