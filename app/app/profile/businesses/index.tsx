/**
 * My Businesses — owner list page.
 * Accessible dari Profile menu. Shows semua bisnis user (incl nonaktif),
 * dengan "+" button untuk create baru.
 */
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Store } from 'lucide-react-native';

import { BusinessRow } from '@/components/market/BusinessRow';
import { useMyBusinesses } from '@/hooks/useLocalBusiness';

export default function MyBusinessesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useMyBusinesses();

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
            {t('my_business.title')}
          </Text>
          <Pressable
            onPress={() => router.push('/profile/businesses/new' as never)}
            className="bg-brand-500 rounded-full px-3 py-2 flex-row items-center gap-1.5"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-bold text-white">
              {t('my_business.add_btn')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {query.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-12 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">
              {t('error.generic')}
            </Text>
            <Pressable
              onPress={() => query.refetch()}
              className="bg-brand-500 rounded-full px-4 py-2"
            >
              <Text className="text-sm font-bold text-white">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState onAdd={() => router.push('/profile/businesses/new' as never)} />
        ) : (
          <View className="gap-2.5">
            {(query.data ?? []).map((biz) => (
              <BusinessRow
                key={biz.id}
                business={biz}
                variant="owner"
                onPress={() =>
                  router.push(`/profile/businesses/${biz.id}` as never)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-16 px-8">
      <View className="w-20 h-20 rounded-2xl bg-brand-50 items-center justify-center mb-3">
        <Store size={36} color="#EA580C" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 text-center">
        {t('my_business.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1 mb-4 leading-relaxed">
        {t('my_business.empty_msg')}
      </Text>
      <Pressable
        onPress={onAdd}
        className="bg-brand-500 rounded-full px-5 py-3 flex-row items-center gap-2"
      >
        <Plus size={16} color="#fff" />
        <Text className="text-sm font-bold text-white">
          {t('my_business.add_first_btn')}
        </Text>
      </Pressable>
    </View>
  );
}
