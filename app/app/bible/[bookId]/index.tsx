import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { hasSampleChapter } from '@/data/bible-sample-content';

/** Book detail — grid pasal 1..totalBab dengan indikator sample-available */
export default function BibleBookScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const book = BIBLE_BOOK_BY_ID.get(Number(bookId));

  if (!book) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <Text className="text-sm text-neutral-500">404</Text>
      </View>
    );
  }

  const chapters = Array.from({ length: book.totalBab }, (_, i) => i + 1);

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-purple-600 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">{book.nama}</Text>
              <Text className="text-xs text-white/80">
                {t('bible.chapters_count', { count: book.totalBab })} ·{' '}
                {book.testament === 'OT' ? t('bible.ot_short') : t('bible.nt_short')}
              </Text>
            </View>
          </View>
          <View className="px-5 pb-4">
            <Text className="text-2xl font-bold text-white">
              {book.nama}{' '}
              <Text className="text-white/70 text-base font-normal">({book.namaEn})</Text>
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          {t('bible.select_chapter')}
        </Text>

        <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
          {chapters.map((bab) => {
            const ref = `${book.singkatan.toUpperCase()} ${bab}`;
            const available = hasSampleChapter(ref);
            return (
              <View key={bab} style={{ width: '20%', paddingHorizontal: 4, marginBottom: 8 }}>
                <Pressable
                  onPress={() => router.push(`/bible/${book.id}/${bab}`)}
                  className={`aspect-square rounded-xl items-center justify-center border ${
                    available
                      ? 'bg-purple-600 border-purple-700'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      available ? 'text-white' : 'text-neutral-700'
                    }`}
                  >
                    {bab}
                  </Text>
                  {available ? (
                    <Text className="text-[8px] text-white/80 font-bold mt-0.5">★</Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View className="mt-4 bg-white rounded-xl p-3 border border-neutral-100">
          <View className="flex-row items-center gap-2">
            <View className="w-5 h-5 rounded-md bg-purple-600 items-center justify-center">
              <Text className="text-[8px] text-white font-bold">★</Text>
            </View>
            <Text className="text-xs text-neutral-700 flex-1">
              {t('bible.sample_available_msg')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
