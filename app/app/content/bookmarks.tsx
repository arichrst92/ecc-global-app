import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bookmark, X } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { useBookmarksStore, type BookmarkItem } from '@/stores/bookmarks.store';
import { formatDate } from '@/utils/date';

export default function BookmarksScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();

  const items = useBookmarksStore((s) => s.items);
  const remove = useBookmarksStore((s) => s.remove);

  const list = Object.values(items).sort((a, b) => b.savedAt - a.savedAt);

  function handlePress(item: BookmarkItem) {
    const slugOrId = item.slug || item.id;
    if (item.tipe === 'NEWS') {
      router.push(`/content/news/${slugOrId}`);
    } else {
      router.push(`/content/renungan/${slugOrId}`);
    }
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
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('content.bookmarks_title')}
          </Text>
        </View>
      </SafeAreaView>

      <FlatList
        data={list}
        keyExtractor={(item) => `${item.tipe}:${item.id}`}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 32,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="items-center py-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <Bookmark size={28} color="#A3A3A3" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700">
              {t('content.bookmarks_empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('content.bookmarks_empty_body')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            className="bg-white rounded-2xl overflow-hidden border border-neutral-100 flex-row"
          >
            <HeroImage
              url={item.heroImageUrl}
              fallbackEmoji={item.tipe === 'NEWS' ? '📰' : '📖'}
              emojiSize={28}
              className="w-24 h-24"
            />
            <View className="flex-1 p-3">
              <Text className="text-[10px] font-semibold text-brand-600 uppercase mb-1">
                {item.tipe === 'NEWS' ? t('content.tab_news') : t('content.tab_renungan')}
              </Text>
              <Text className="font-bold text-neutral-900 mb-1" numberOfLines={2}>
                {item.judul}
              </Text>
              <Text className="text-xs text-neutral-500" numberOfLines={2}>
                {item.ringkasan}
              </Text>
              <Text className="text-[10px] text-neutral-400 mt-1">
                {formatDate(item.publishedAt, lang)}
              </Text>
            </View>
            <Pressable
              onPress={() => remove(item.tipe, item.id)}
              accessibilityLabel={t('content.bookmark_remove')}
              hitSlop={8}
              className="w-8 h-8 items-center justify-center m-1"
            >
              <X size={16} color="#A3A3A3" />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}
