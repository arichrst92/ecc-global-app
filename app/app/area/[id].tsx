import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Info, MapPinned, Users } from 'lucide-react-native';

import { useManagedAreas, useManagedHomecells } from '@/hooks/useHomecell';

export default function AreaDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const areasQuery = useManagedAreas();
  const homecellsQuery = useManagedHomecells();

  const area = areasQuery.data?.find((a) => a.id === id);

  // Filter homecell yang ada di area ini (kalau user juga PIC homecell-nya).
  // BE belum expose endpoint untuk list ALL homecell di area regardless apakah
  // user juga PIC homecell-nya, jadi sementara show subset yang user manage.
  const homecellsInArea = useMemo(() => {
    return (homecellsQuery.data ?? []).filter((h) => h.area.id === id);
  }, [homecellsQuery.data, id]);

  if (areasQuery.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!area) {
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
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('area.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

  const partialList = homecellsInArea.length < area.homecellCount;

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-cyan-600 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">
              {t('area.detail_title')}
            </Text>
          </View>
          <View className="px-5 pb-6 pt-2">
            <View className="bg-white/20 self-start px-2.5 py-1 rounded-full mb-2">
              <Text className="text-[10px] font-bold text-white tracking-wider">
                {t('area.pic_badge')}
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold">{area.nama}</Text>
            <Text className="text-white/80 text-sm mt-1">{area.cabang.nama}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Stats */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-4 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-xl bg-cyan-100 items-center justify-center">
            <MapPinned size={22} color="#0891b2" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('area.total_homecells')}</Text>
            <Text className="text-2xl font-bold text-neutral-900">
              {area.homecellCount}
            </Text>
          </View>
        </View>

        {/* Homecells list */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('area.homecells_section')}
        </Text>

        {homecellsQuery.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : homecellsInArea.length === 0 ? (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex-row gap-2">
            <Info size={16} color="#92400e" style={{ marginTop: 2 }} />
            <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
              {t('area.no_managed_in_area')}
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-2">
              {homecellsInArea.map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => router.push(`/homecell/${h.id}`)}
                  className="bg-white rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100"
                >
                  <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
                    <Users size={18} color="#0891b2" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-neutral-900" numberOfLines={1}>
                      {h.nama}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Users size={11} color="#0891b2" />
                      <Text className="text-xs text-cyan-700 font-semibold">
                        {h.memberCount} {t('homecell.members_count')}
                      </Text>
                      {h.hari ? (
                        <Text className="text-xs text-neutral-500 ml-2">
                          · {h.hari}
                          {h.jam ? ` ${h.jam}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight size={16} color="#A3A3A3" />
                </Pressable>
              ))}
            </View>

            {partialList ? (
              <View className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex-row gap-2">
                <Info size={14} color="#92400e" style={{ marginTop: 2 }} />
                <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
                  {t('area.partial_list_notice', {
                    visible: homecellsInArea.length,
                    total: area.homecellCount,
                  })}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
