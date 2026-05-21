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
import { ArrowLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';

import { useManagedHomecells } from '@/hooks/useHomecell';
import type { PicHomecell } from '@/types/homecell';

export default function HomecellListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useManagedHomecells();
  const homecells = query.data ?? [];

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
              {t('homecell.title')}
            </Text>
            <Text className="text-xs text-neutral-500">{t('homecell.subtitle')}</Text>
          </View>
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
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => query.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : homecells.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <Users size={32} color="#A3A3A3" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700 text-center">
              {t('homecell.empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('homecell.empty_msg')}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {homecells.map((h) => (
              <HomecellCard
                key={h.id}
                item={h}
                onPress={() => router.push(`/homecell/${h.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HomecellCard({
  item,
  onPress,
}: {
  item: PicHomecell;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-12 h-12 rounded-xl bg-cyan-100 items-center justify-center">
        <Users size={20} color="#0891b2" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-bold text-neutral-900" numberOfLines={1}>
          {item.nama}
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          <MapPin size={11} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500" numberOfLines={1}>
            {item.area.nama} · {item.area.cabang.nama}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Users size={11} color="#0891b2" />
            <Text className="text-xs font-semibold text-cyan-700">
              {item.memberCount} {t('homecell.members_count')}
            </Text>
          </View>
          {item.hari ? (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#A3A3A3" />
              <Text className="text-xs text-neutral-500">
                {item.hari}
                {item.jam ? ` · ${item.jam}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
