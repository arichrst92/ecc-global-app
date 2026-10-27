/** Bible 365 — Jurnal: semua catatan renungan, terbaru dulu. */
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, NotebookPen } from 'lucide-react-native';

import { listBible365Notes } from '@/api/bible365';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { useBookNames } from '@/utils/bibleNames';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function Bible365JournalScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const names = useBookNames();
  const q = useInfiniteQuery({
    queryKey: ['bible365', 'journal'],
    queryFn: ({ pageParam }) => listBible365Notes(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const label = (c: { bookId: number; bab: number }) => {
    const b = BIBLE_BOOK_BY_ID.get(c.bookId);
    return b ? `${names.name(b)} ${c.bab}` : '';
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/bible365')} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('b365.journal')}</Text>
            <Text className="text-xs text-neutral-500">{t('b365.journal_sub')}</Text>
          </View>
        </View>
      </SafeAreaView>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.day)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        ListEmptyComponent={
          q.isPending ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
          ) : (
            <View className="items-center py-16 px-8">
              <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
                <NotebookPen size={28} color={nc('#A3A3A3')} />
              </View>
              <Text className="text-sm font-bold text-neutral-900">{t('b365.journal_empty')}</Text>
              <Text className="text-xs text-neutral-500 text-center mt-1">{t('b365.journal_empty_body')}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/bible365/note?day=${item.day}` as never)}
            className="bg-card rounded-2xl border border-neutral-100 p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-brand-700">{t('b365.day_n', { day: item.day })}</Text>
              <Text className="text-[11px] text-neutral-400">{formatDateWithDay(item.date, i18n.language)}</Text>
            </View>
            <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
              {item.chapters.map(label).filter(Boolean).join(' · ')}
            </Text>
            <Text className="text-sm text-neutral-800 mt-2 leading-relaxed" numberOfLines={4}>
              {item.isi}
            </Text>
            {item.ayat ? <Text className="text-xs font-semibold text-brand-700 mt-2">{item.ayat}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}
