import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Newspaper } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { useNewsList, useRenunganList } from '@/hooks/useContent';
import { formatDate } from '@/utils/date';
import type { NewsItem, RenunganItem } from '@/types/content';

type Tab = 'news' | 'renungan';

export default function ContentListScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    tab === 'renungan' ? 'renungan' : 'news',
  );

  const newsQuery = useNewsList();
  const renunganQuery = useRenunganList();

  const activeQuery = activeTab === 'news' ? newsQuery : renunganQuery;

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
            {t('content.title')}
          </Text>
        </View>

        {/* Tab switcher */}
        <View className="flex-row px-4 pb-2 gap-2">
          <TabChip
            label={t('content.tab_news')}
            icon={<Newspaper size={14} color={activeTab === 'news' ? '#fff' : '#525252'} />}
            active={activeTab === 'news'}
            onPress={() => setActiveTab('news')}
          />
          <TabChip
            label={t('content.tab_renungan')}
            icon={<BookOpen size={14} color={activeTab === 'renungan' ? '#fff' : '#525252'} />}
            active={activeTab === 'renungan'}
            onPress={() => setActiveTab('renungan')}
          />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => activeQuery.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {activeQuery.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : activeQuery.isError ? (
          <ErrorState onRetry={() => activeQuery.refetch()} />
        ) : (activeQuery.data?.length ?? 0) === 0 ? (
          <EmptyState type={activeTab} />
        ) : activeTab === 'news' ? (
          <View className="gap-3">
            {(newsQuery.data ?? []).map((n) => (
              <NewsCard key={n.id} item={n} lang={lang} onPress={() => router.push(`/content/news/${n.slug || n.id}`)} />
            ))}
          </View>
        ) : (
          <View className="gap-3">
            {(renunganQuery.data ?? []).map((r) => (
              <RenunganCard
                key={r.id}
                item={r}
                lang={lang}
                onPress={() => router.push(`/content/renungan/${r.slug || r.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TabChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
        active ? 'bg-brand-500' : 'bg-neutral-100'
      }`}
    >
      {icon}
      <Text
        className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NewsCard({
  item,
  lang,
  onPress,
}: {
  item: NewsItem;
  lang: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden border border-neutral-100"
    >
      {/* Fit-to-width: tinggi proporsional sesuai aspect rasio asli image */}
      <HeroImage url={item.heroImageUrl} fallbackEmoji="📰" emojiSize={48} fitToWidth />
      <View className="p-4">
        <Text className="text-xs text-neutral-500 mb-1">
          {formatDate(item.publishedAt, lang)}
          {item.cabang ? ` · ${item.cabang.nama}` : ''}
        </Text>
        <Text className="font-bold text-neutral-900 mb-1.5" numberOfLines={2}>
          {item.judul}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={2}>
          {item.ringkasan}
        </Text>
      </View>
    </Pressable>
  );
}

function RenunganCard({
  item,
  lang,
  onPress,
}: {
  item: RenunganItem;
  lang: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden border border-neutral-100"
    >
      {/* Vertical layout (sama dengan NewsCard) — fit-to-width image di atas, text di bawah */}
      <HeroImage url={item.heroImageUrl} fallbackEmoji="📖" emojiSize={48} fitToWidth />
      <View className="p-4">
        <Text className="text-xs text-brand-600 font-semibold mb-1" numberOfLines={1}>
          {item.ayatAlkitab}
        </Text>
        <Text className="text-xs text-neutral-500 mb-1">
          {formatDate(item.tanggal, lang)}
        </Text>
        <Text className="font-bold text-neutral-900 mb-1.5" numberOfLines={2}>
          {item.judul}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={2}>
          {item.ringkasan}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ type }: { type: Tab }) {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
      <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
        {type === 'news' ? (
          <Newspaper size={28} color="#A3A3A3" />
        ) : (
          <BookOpen size={28} color="#A3A3A3" />
        )}
      </View>
      <Text className="text-lg font-semibold text-neutral-700">
        {type === 'news' ? t('content.empty_news') : t('content.empty_renungan')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1">
        {t('content.empty_msg')}
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
