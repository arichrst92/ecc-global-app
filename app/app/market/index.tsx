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
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react-native';

import { BusinessRow } from '@/components/market/BusinessRow';
import { useLocalMarket } from '@/hooks/useLocalBusiness';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { listCabang } from '@/api/cabang';
import { INDUSTRI_SUGGESTIONS, type LocalBusiness, type TipeBisnis } from '@/types/localBusiness';

type OnlineFilter = 'all' | 'online' | 'offline';

export default function LocalMarketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { viewingCabangId } = useViewingBranch();
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Advanced filters via modal: cabang, industri, tipe
  const [filterOpen, setFilterOpen] = useState(false);
  // Default cabang = user's viewing cabang. User can override via filter.
  const [cabangId, setCabangId] = useState<string | undefined>(
    viewingCabangId ?? undefined,
  );
  const [industri, setIndustri] = useState<string | undefined>();
  const [tipeBisnis, setTipeBisnis] = useState<TipeBisnis | undefined>();

  // Debounce search 300ms
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const query = useLocalMarket({
    cabangId,
    industri,
    tipeBisnis,
    isOnline:
      onlineFilter === 'all' ? undefined : onlineFilter === 'online',
    search: debouncedSearch || undefined,
  });

  // Count active filters utk badge di tombol filter
  const activeFilterCount = [
    cabangId !== viewingCabangId ? 1 : 0,
    industri ? 1 : 0,
    tipeBisnis ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

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

        {/* Search bar + filter button */}
        <View className="px-4 pb-2 flex-row gap-2">
          <View className="flex-1 bg-neutral-100 rounded-xl flex-row items-center px-3 gap-2">
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
          <Pressable
            onPress={() => setFilterOpen(true)}
            className={`px-3 rounded-xl items-center justify-center relative ${
              activeFilterCount > 0 ? 'bg-brand-500' : 'bg-neutral-100'
            }`}
          >
            <SlidersHorizontal
              size={18}
              color={activeFilterCount > 0 ? '#fff' : '#525252'}
            />
            {activeFilterCount > 0 ? (
              <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-white border-2 border-brand-500 items-center justify-center px-1">
                <Text className="text-[9px] font-bold text-brand-700">
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingBottom: 32,
            gap: 10,
          }}
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
            <BusinessRow
              business={item}
              onPress={() => router.push(`/market/${item.id}` as never)}
            />
          )}
        />
      )}

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        cabangId={cabangId}
        industri={industri}
        tipeBisnis={tipeBisnis}
        defaultCabangId={viewingCabangId ?? undefined}
        onApply={(next) => {
          setCabangId(next.cabangId);
          setIndustri(next.industri);
          setTipeBisnis(next.tipeBisnis);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}

type FilterState = {
  cabangId?: string;
  industri?: string;
  tipeBisnis?: TipeBisnis;
};

function FilterModal({
  visible,
  onClose,
  cabangId,
  industri,
  tipeBisnis,
  defaultCabangId,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  cabangId?: string;
  industri?: string;
  tipeBisnis?: TipeBisnis;
  defaultCabangId?: string;
  onApply: (next: FilterState) => void;
}) {
  const { t } = useTranslation();
  // Local pending state — apply ke parent saat user tap "Apply"
  const [pendingCabang, setPendingCabang] = useState<string | undefined>(cabangId);
  const [pendingIndustri, setPendingIndustri] = useState<string | undefined>(industri);
  const [pendingTipe, setPendingTipe] = useState<TipeBisnis | undefined>(tipeBisnis);

  // Sync ke parent state setiap modal open
  useMemo(() => {
    if (visible) {
      setPendingCabang(cabangId);
      setPendingIndustri(industri);
      setPendingTipe(tipeBisnis);
    }
  }, [visible, cabangId, industri, tipeBisnis]);

  const cabangQuery = useQuery({
    queryKey: ['cabang', 'list'],
    queryFn: () => listCabang(),
    staleTime: 10 * 60_000,
    enabled: visible,
  });
  const cabangList = cabangQuery.data ?? [];

  function handleReset() {
    setPendingCabang(defaultCabangId);
    setPendingIndustri(undefined);
    setPendingTipe(undefined);
  }

  function handleApply() {
    onApply({
      cabangId: pendingCabang,
      industri: pendingIndustri,
      tipeBisnis: pendingTipe,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable onPress={() => {}} className="bg-white rounded-t-3xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 pb-3 border-b border-neutral-100">
            <Text className="text-lg font-bold text-neutral-900 flex-1">
              {t('market.filter_title')}
            </Text>
            <Pressable
              onPress={handleReset}
              className="px-3 py-1.5 rounded-full bg-neutral-100"
            >
              <Text className="text-xs font-semibold text-neutral-700">
                {t('market.filter_reset')}
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
            {/* Cabang */}
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('market.filter_cabang')}
            </Text>
            {cabangQuery.isPending ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : (
              <View className="bg-neutral-50 rounded-2xl border border-neutral-200 mb-5">
                <FilterRow
                  label={t('market.filter_cabang_all')}
                  selected={!pendingCabang}
                  onPress={() => setPendingCabang(undefined)}
                  isFirst
                />
                {cabangList.map((c, idx) => (
                  <FilterRow
                    key={c.id}
                    label={c.nama}
                    sub={c.kode ?? undefined}
                    selected={pendingCabang === c.id}
                    onPress={() => setPendingCabang(c.id)}
                    isFirst={idx === 0 && false}
                  />
                ))}
              </View>
            )}

            {/* Tipe Bisnis */}
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('market.filter_tipe')}
            </Text>
            <View className="flex-row gap-2 mb-5">
              <TipeChip
                label={t('market.filter_all')}
                selected={!pendingTipe}
                onPress={() => setPendingTipe(undefined)}
              />
              {(['B2C', 'B2B', 'B2B2C'] as const).map((tp) => (
                <TipeChip
                  key={tp}
                  label={tp}
                  selected={pendingTipe === tp}
                  onPress={() => setPendingTipe(tp)}
                />
              ))}
            </View>

            {/* Industri */}
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('market.filter_industri')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              <Pressable
                onPress={() => setPendingIndustri(undefined)}
                className={`px-3 py-1.5 rounded-full ${
                  !pendingIndustri ? 'bg-brand-500' : 'bg-neutral-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    !pendingIndustri ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  {t('market.filter_all')}
                </Text>
              </Pressable>
              {INDUSTRI_SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setPendingIndustri(pendingIndustri === s ? undefined : s)}
                  className={`px-3 py-1.5 rounded-full ${
                    pendingIndustri === s ? 'bg-brand-500' : 'bg-neutral-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      pendingIndustri === s ? 'text-white' : 'text-neutral-600'
                    }`}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom industri text */}
            <Text className="text-[11px] text-neutral-500 mb-1">
              {t('market.filter_industri_custom_hint')}
            </Text>
            <TextInput
              value={pendingIndustri ?? ''}
              onChangeText={(v) => setPendingIndustri(v.trim() || undefined)}
              placeholder={t('market.filter_industri_custom_placeholder')}
              maxLength={100}
              className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-sm text-neutral-900"
            />
          </ScrollView>

          {/* Apply button sticky */}
          <View className="px-5 pt-3 pb-5 border-t border-neutral-100">
            <Pressable
              onPress={handleApply}
              className="bg-brand-500 rounded-full py-3 items-center"
            >
              <Text className="text-sm font-bold text-white">
                {t('market.filter_apply')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterRow({
  label,
  sub,
  selected,
  onPress,
  isFirst,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  isFirst?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 p-3 ${
        isFirst ? '' : 'border-t border-neutral-200'
      }`}
    >
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text className="text-[10px] text-neutral-500 mt-0.5 font-mono">
            {sub}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center">
          <Check size={14} color="#fff" />
        </View>
      ) : (
        <View className="w-6 h-6 rounded-full border border-neutral-300" />
      )}
    </Pressable>
  );
}

function TipeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-3 rounded-xl border items-center ${
        selected ? 'bg-brand-50 border-brand-500' : 'bg-white border-neutral-200'
      }`}
    >
      <Text
        className={`text-sm font-bold ${
          selected ? 'text-brand-700' : 'text-neutral-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
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

