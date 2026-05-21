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
  ChevronRight,
  Clock,
  Info,
  MapPinned,
  UserCog,
  Users,
} from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';
import { useManagedAreas, useManagedHomecells } from '@/hooks/useHomecell';
import type { PicArea, PicHomecell } from '@/types/homecell';

/**
 * Area list — flatten + grouped by area.
 *
 * Pakai data dari /admin/me/homecell-area-managed (PIC area) + /admin/me/
 * homecell-managed (PIC homecell user). Untuk setiap area yang user PIC,
 * tampil sebagai section header, lalu list homecell di area itu yang user
 * juga PIC homecell-nya (subset).
 *
 * Tap homecell row → /homecell/[id] (detail homecell).
 *
 * PIC name per homecell saat ini = current user (karena BE return hanya
 * homecells yang user PIC-nya). Saat BE expose /admin/homecell-area/:id/
 * homecells, list jadi lengkap dengan PIC info per homecell.
 */
export default function AreaListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const areasQuery = useManagedAreas();
  const homecellsQuery = useManagedHomecells();

  const isRefreshing = areasQuery.isRefetching || homecellsQuery.isRefetching;
  const isLoading = areasQuery.isPending || homecellsQuery.isPending;

  const areas = areasQuery.data ?? [];
  const homecells = homecellsQuery.data ?? [];

  // Group homecells by areaId
  const homecellsByArea = useMemo(() => {
    const map = new Map<string, PicHomecell[]>();
    for (const h of homecells) {
      const list = map.get(h.area.id) ?? [];
      list.push(h);
      map.set(h.area.id, list);
    }
    return map;
  }, [homecells]);

  function refresh() {
    areasQuery.refetch();
    homecellsQuery.refetch();
  }

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
              {t('area.title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('area.subtitle')}</Text>
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
        ) : areasQuery.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={refresh}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : areas.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <MapPinned size={32} color="#A3A3A3" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700 text-center">
              {t('area.empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('area.empty_msg')}
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            {areas.map((area) => {
              const inArea = homecellsByArea.get(area.id) ?? [];
              const partial = inArea.length < area.homecellCount;
              return (
                <AreaSection
                  key={area.id}
                  area={area}
                  homecells={inArea}
                  partial={partial}
                  picName={user?.namaLengkap ?? '—'}
                  onHomecellPress={(hid) => router.push(`/homecell/${hid}`)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AreaSection({
  area,
  homecells,
  partial,
  picName,
  onHomecellPress,
}: {
  area: PicArea;
  homecells: PicHomecell[];
  partial: boolean;
  picName: string;
  onHomecellPress: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {/* Area header */}
      <View className="bg-cyan-600 rounded-2xl p-4 mb-2 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
          <MapPinned size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{area.nama}</Text>
          <Text className="text-white/80 text-xs mt-0.5">
            {area.cabang.nama} · {area.homecellCount} {t('area.homecells_count')}
          </Text>
        </View>
      </View>

      {/* Homecells in area */}
      {homecells.length === 0 ? (
        <View className="bg-white rounded-2xl p-4 border border-dashed border-neutral-300 items-center">
          <Text className="text-xs text-neutral-500 text-center">
            {t('area.no_managed_in_area')}
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {homecells.map((h) => (
            <HomecellRow
              key={h.id}
              homecell={h}
              picName={picName}
              onPress={() => onHomecellPress(h.id)}
            />
          ))}
        </View>
      )}

      {partial ? (
        <View className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex-row gap-2">
          <Info size={12} color="#92400e" style={{ marginTop: 2 }} />
          <Text className="text-[11px] text-amber-800 flex-1 leading-relaxed">
            {t('area.partial_list_notice', {
              visible: homecells.length,
              total: area.homecellCount,
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function HomecellRow({
  homecell,
  picName,
  onPress,
}: {
  homecell: PicHomecell;
  picName: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
        <Users size={18} color="#0891b2" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-semibold text-neutral-900" numberOfLines={1}>
          {homecell.nama}
        </Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <UserCog size={11} color="#737373" />
          <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
            {t('area.pic_label')}: {picName}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Users size={11} color="#0891b2" />
            <Text className="text-xs font-semibold text-cyan-700">
              {homecell.memberCount} {t('homecell.members_count')}
            </Text>
          </View>
          {homecell.hari ? (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#A3A3A3" />
              <Text className="text-xs text-neutral-500">
                {homecell.hari}
                {homecell.jam ? ` · ${homecell.jam}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
