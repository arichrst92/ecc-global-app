/**
 * CKids Tab — parent view untuk anak point + katalog hadiah + history.
 *
 * Layout:
 * 1. Anak selector (kalau multi anak) — dropdown
 * 2. Point balance card besar (per cabang)
 * 3. Tombol "Tunjukkan QR ke Stall"
 * 4. Katalog grid hadiah cabang (3-kolom)
 * 5. History redeem list
 *
 * Redeem di mobile → TIDAK ada. Anak harus datang fisik ke stall di
 * subdomain ckids.eccchurch.global.
 *
 * Per BE notice ckids-mobile-tab 2026-08-01.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
  Baby,
  ChevronDown,
  Gift,
  History,
  Info,
  QrCode,
  ShoppingBag,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  useHadiahKatalog,
  useMyChildren,
  useMyChildrenGroupedBalances,
  useChildRedeemHistory,
} from '@/hooks/useCKids';
import { useCKidsSelectionStore } from '@/stores/ckids-selection.store';
import type { ChildGroupedBalance, HadiahKatalog, HadiahRedeem } from '@/types/ckids';
import { formatDate } from '@/utils/date';
import { env } from '@/config/env';

export default function CKidsTabScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();

  const { children: myChildren, isPending: childrenPending, isEmpty } = useMyChildren();
  const balancesQuery = useMyChildrenGroupedBalances();

  const selectedAnakId = useCKidsSelectionStore((s) => s.selectedAnakId);
  const setSelectedAnakId = useCKidsSelectionStore((s) => s.setSelectedAnakId);
  const ensureDefault = useCKidsSelectionStore((s) => s.ensureDefault);
  const hydrate = useCKidsSelectionStore((s) => s.hydrate);
  const isHydrating = useCKidsSelectionStore((s) => s.isHydrating);

  const [selectorOpen, setSelectorOpen] = useState(false);

  // Hydrate selection store on mount (parallel dgn other stores at app boot)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auto-select first anak kalau belum ada selection + list ready
  useEffect(() => {
    if (!isHydrating && !selectedAnakId && balancesQuery.data.length > 0) {
      ensureDefault(balancesQuery.data[0].anak.id);
    }
  }, [isHydrating, selectedAnakId, balancesQuery.data, ensureDefault]);

  const selected = useMemo<ChildGroupedBalance | null>(() => {
    if (!selectedAnakId) return balancesQuery.data[0] ?? null;
    return balancesQuery.data.find((b) => b.anak.id === selectedAnakId) ?? null;
  }, [selectedAnakId, balancesQuery.data]);

  // Primary balance row untuk display (kalau anak multi-cabang, pilih yg balance terbesar)
  const primaryBalance = useMemo(() => {
    if (!selected) return null;
    return (
      selected.balances.reduce(
        (max, curr) => (curr.balance > max.balance ? curr : max),
        selected.balances[0],
      ) ?? null
    );
  }, [selected]);

  const cabangId = primaryBalance?.cabang.id;
  const katalogQuery = useHadiahKatalog(cabangId);
  // Post BE response 2026-08-03: dedicated endpoint scope by JemaatRelasi
  // (cabangId tidak dipakai — BE filter by jemaatId + parent guard)
  const historyQuery = useChildRedeemHistory(selected?.anak.id, 50);

  const isRefreshing = balancesQuery.isPending
    ? false
    : katalogQuery.isRefetching || historyQuery.isRefetching;

  function refresh() {
    balancesQuery && katalogQuery.refetch();
    historyQuery.refetch();
  }

  // Empty state — user tidak punya anak (bisa via family relations)
  if (!childrenPending && isEmpty) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-3xl bg-pink-50 items-center justify-center mb-4">
            <Baby size={40} color="#EC4899" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center mb-2">
            {t('ckids.empty_title')}
          </Text>
          <Text className="text-sm text-neutral-500 text-center mb-6">
            {t('ckids.empty_body')}
          </Text>
          <Button
            label={t('ckids.add_child_cta')}
            onPress={() => router.push('/family/add' as never)}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (childrenPending || balancesQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#EC4899" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-3 flex-row items-center gap-2">
          <Baby size={22} color="#EC4899" />
          <Text className="text-lg font-bold text-neutral-900 flex-1">
            {t('ckids.tab_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#EC4899" />
        }
      >
        {/* Anak selector */}
        {myChildren.length > 1 ? (
          <View className="bg-white px-4 py-3 border-b border-neutral-100">
            <Text className="text-xs font-bold text-neutral-500 uppercase mb-2">
              {t('ckids.selected_anak')}
            </Text>
            <Pressable
              onPress={() => setSelectorOpen(true)}
              className="flex-row items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200"
            >
              {selected ? (
                <>
                  <Avatar
                    size={40}
                    name={selected.anak.namaLengkap}
                    fotoUrl={selected.anak.fotoUrl}
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-neutral-900">
                      {selected.anak.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {selected.balances[0]?.cabang.nama ?? '—'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text className="flex-1 text-sm text-neutral-500">
                  {t('ckids.no_selection')}
                </Text>
              )}
              <ChevronDown size={18} color="#737373" />
            </Pressable>
          </View>
        ) : null}

        {/* Point balance card */}
        {selected && primaryBalance ? (
          <View className="bg-white mt-2 p-5">
            <View className="rounded-3xl overflow-hidden">
              <View className="bg-pink-500 p-5">
                <Text className="text-xs font-bold text-white/80 uppercase">
                  {t('ckids.balance_label')}
                </Text>
                <View className="flex-row items-baseline gap-2 mt-1">
                  <Text className="text-5xl font-bold text-white">
                    {primaryBalance.balance}
                  </Text>
                  <Text className="text-lg font-semibold text-white/80">
                    {t('ckids.points_unit')}
                  </Text>
                </View>
                <Text className="text-xs text-white/70 mt-1">
                  {selected.anak.namaLengkap} · {primaryBalance.cabang.nama}
                </Text>
                {selected.balances.length > 1 ? (
                  <Text className="text-[10px] text-white/70 mt-2">
                    +{selected.balances.length - 1} {t('ckids.other_branches')}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => router.push('/ckids/qr' as never)}
                className="bg-white flex-row items-center justify-center gap-2 py-4 border-t-2 border-pink-100 active:bg-pink-50"
              >
                <QrCode size={20} color="#EC4899" />
                <Text className="text-sm font-bold text-pink-700">
                  {t('ckids.show_qr_cta')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Info card: redeem hanya di stall */}
        <View className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
          <Info size={14} color="#92400e" style={{ marginTop: 1 }} />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            {t('ckids.stall_info')}
          </Text>
        </View>

        {/* Katalog hadiah */}
        <View className="bg-white mt-3 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <ShoppingBag size={16} color="#EC4899" />
            <Text className="text-sm font-bold text-neutral-900">
              {t('ckids.katalog_title')}
            </Text>
          </View>
          {katalogQuery.isPending ? (
            <ActivityIndicator color="#EC4899" style={{ marginVertical: 24 }} />
          ) : katalogQuery.data && katalogQuery.data.length > 0 ? (
            <FlatList
              data={katalogQuery.data}
              horizontal={false}
              numColumns={3}
              columnWrapperStyle={{ gap: 8 }}
              contentContainerStyle={{ gap: 8 }}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <HadiahCard
                  item={item}
                  currentBalance={primaryBalance?.balance ?? 0}
                />
              )}
            />
          ) : (
            <View className="items-center py-8">
              <Gift size={32} color="#D4D4D4" />
              <Text className="text-xs text-neutral-500 mt-2">
                {t('ckids.katalog_empty')}
              </Text>
            </View>
          )}
        </View>

        {/* History redeem */}
        <View className="bg-white mt-3 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <History size={16} color="#EC4899" />
            <Text className="text-sm font-bold text-neutral-900">
              {t('ckids.history_title')}
            </Text>
          </View>
          {historyQuery.isPending ? (
            <ActivityIndicator color="#EC4899" style={{ marginVertical: 16 }} />
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <View className="gap-2">
              {historyQuery.data.slice(0, 10).map((r) => (
                <RedeemRow key={r.id} item={r} lang={lang} />
              ))}
            </View>
          ) : (
            <Text className="text-xs text-neutral-500 text-center py-4">
              {t('ckids.history_empty')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Anak selector modal */}
      <Modal
        visible={selectorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorOpen(false)}
      >
        <Pressable
          onPress={() => setSelectorOpen(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl p-5">
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-base font-bold text-neutral-900 mb-4">
              {t('ckids.select_anak_title')}
            </Text>
            <View className="gap-2">
              {balancesQuery.data.map((c) => (
                <Pressable
                  key={c.anak.id}
                  onPress={() => {
                    setSelectedAnakId(c.anak.id);
                    setSelectorOpen(false);
                  }}
                  className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                    c.anak.id === selectedAnakId
                      ? 'bg-pink-50 border-pink-300'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Avatar size={40} name={c.anak.namaLengkap} fotoUrl={c.anak.fotoUrl} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-neutral-900">
                      {c.anak.namaLengkap}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {c.totalBalance} {t('ckids.points_unit')} ·{' '}
                      {c.balances.length}{' '}
                      {c.balances.length === 1
                        ? t('ckids.branch_singular')
                        : t('ckids.branch_plural')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ==============================================================
 * HADIAH CARD
 * ============================================================== */
function HadiahCard({
  item,
  currentBalance,
}: {
  item: HadiahKatalog;
  currentBalance: number;
}) {
  const { t } = useTranslation();
  const canAfford = currentBalance >= item.pointCost;
  const inStock = item.stock > 0;

  return (
    <View
      className={`flex-1 bg-white rounded-xl overflow-hidden border ${
        canAfford && inStock ? 'border-pink-200' : 'border-neutral-200'
      }`}
      style={{ minWidth: 0 }}
    >
      <View className="aspect-square bg-neutral-100 items-center justify-center">
        {item.fotoUrl ? (
          <Image
            source={{
              uri: item.fotoUrl.startsWith('http')
                ? item.fotoUrl
                : `${env.apiBaseUrl}${item.fotoUrl}`,
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Gift size={28} color="#A3A3A3" />
        )}
      </View>
      <View className="p-2">
        <Text className="text-[11px] font-semibold text-neutral-900" numberOfLines={2}>
          {item.nama}
        </Text>
        <View className="flex-row items-baseline gap-0.5 mt-1">
          <Text
            className={`text-xs font-bold ${
              canAfford ? 'text-pink-600' : 'text-neutral-500'
            }`}
          >
            {item.pointCost}
          </Text>
          <Text className="text-[10px] text-neutral-500">pts</Text>
        </View>
        {!inStock ? (
          <Text className="text-[10px] text-red-600 mt-0.5">{t('ckids.out_of_stock')}</Text>
        ) : item.stock < 5 ? (
          <Text className="text-[10px] text-amber-700 mt-0.5">
            {t('ckids.stock_left', { count: item.stock })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ==============================================================
 * REDEEM ROW
 * ============================================================== */
function RedeemRow({ item, lang }: { item: HadiahRedeem; lang: string }) {
  return (
    <View className="flex-row items-center gap-3 py-2 border-b border-neutral-100">
      <View className="w-10 h-10 rounded-lg bg-neutral-100 items-center justify-center overflow-hidden">
        {item.hadiahFotoUrl ? (
          <Image
            source={{
              uri: item.hadiahFotoUrl.startsWith('http')
                ? item.hadiahFotoUrl
                : `${env.apiBaseUrl}${item.hadiahFotoUrl}`,
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Gift size={16} color="#A3A3A3" />
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
          {item.hadiahNama}
        </Text>
        <Text className="text-xs text-neutral-500">
          {formatDate(item.processedAt, lang)}
          {item.processedBy ? ` · ${item.processedBy.namaLengkap}` : ''}
        </Text>
      </View>
      <Text className="text-sm font-bold text-red-600">-{item.pointDeducted}</Text>
    </View>
  );
}
