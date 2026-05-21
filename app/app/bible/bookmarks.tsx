import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bookmark, Trash2 } from 'lucide-react-native';

import { useBibleStore } from '@/stores/bible.store';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';

export default function BibleBookmarksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);

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
              {t('bible.bookmarks_title')}
            </Text>
            <Text className="text-xs text-neutral-500">
              {bookmarks.length} {t('bible.bookmark').toLowerCase()}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {bookmarks.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-20 h-20 rounded-2xl bg-amber-50 items-center justify-center mb-3">
              <Bookmark size={32} color="#D97706" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700 text-center">
              {t('bible.bookmarks_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('bible.bookmarks_empty')}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {bookmarks.map((b, idx) => {
              const book = BIBLE_BOOK_BY_ID.get(b.bookId);
              const label = book
                ? `${book.nama} ${b.bab}${b.ayat ? `:${b.ayat}` : ''}`
                : b.ref;
              return (
                <View
                  key={`${b.ref}-${b.ayat ?? 'ch'}-${idx}`}
                  className="bg-white rounded-2xl p-3 border border-neutral-100"
                >
                  <View className="flex-row items-start gap-3">
                    <Pressable
                      onPress={() => router.push(`/bible/${b.bookId}/${b.bab}`)}
                      className="flex-1"
                    >
                      <Text className="text-sm font-bold text-purple-700">
                        {label}
                      </Text>
                      {b.preview ? (
                        <Text className="text-sm text-neutral-700 mt-1 leading-relaxed">
                          "{b.preview}…"
                        </Text>
                      ) : null}
                      <Text className="text-[10px] text-neutral-400 mt-1">
                        {new Date(b.createdAt).toLocaleDateString('id-ID')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeBookmark(b.ref, b.ayat)}
                      className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
