import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Type,
} from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { getSampleChapter } from '@/data/bible-sample-content';
import { useBibleStore } from '@/stores/bible.store';
import type { BibleFontSize, BibleVerse } from '@/types/bible';

/**
 * Chapter reader.
 *
 * - Load chapter dari sample content (BE endpoint belum ada).
 * - Tap ayat → highlight + show actions (bookmark, share).
 * - Font size toggle (sm/md/lg/xl) persist via store.
 * - Prev/Next nav antar pasal dalam kitab yang sama.
 * - Last-read auto-saved saat mount.
 */
export default function BibleChapterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string; bab: string }>();
  const bookId = Number(params.bookId);
  const bab = Number(params.bab);
  const book = BIBLE_BOOK_BY_ID.get(bookId);
  const showToast = useToast((s) => s.show);

  const fontSize = useBibleStore((s) => s.fontSize);
  const setFontSize = useBibleStore((s) => s.setFontSize);
  const setLastRead = useBibleStore((s) => s.setLastRead);
  const addBookmark = useBibleStore((s) => s.addBookmark);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);
  const isBookmarked = useBibleStore((s) => s.isBookmarked);

  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showFontModal, setShowFontModal] = useState(false);

  const ref = book ? `${book.singkatan.toUpperCase()} ${bab}` : '';
  const chapter = ref ? getSampleChapter(ref) : null;

  useEffect(() => {
    if (book) {
      setLastRead(ref, book.id, bab);
    }
  }, [ref, book, bab, setLastRead]);

  if (!book) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <Text className="text-sm text-neutral-500">404</Text>
      </View>
    );
  }

  const fontClass = FONT_SIZE_MAP[fontSize];
  const isBabBookmarked = isBookmarked(ref, null);

  function goPrev() {
    if (bab > 1) {
      router.replace(`/bible/${book!.id}/${bab - 1}`);
    } else if (book!.id > 1) {
      const prevBook = BIBLE_BOOK_BY_ID.get(book!.id - 1);
      if (prevBook) router.replace(`/bible/${prevBook.id}/${prevBook.totalBab}`);
    }
  }

  function goNext() {
    if (bab < book!.totalBab) {
      router.replace(`/bible/${book!.id}/${bab + 1}`);
    } else if (book!.id < 66) {
      const nextBook = BIBLE_BOOK_BY_ID.get(book!.id + 1);
      if (nextBook) router.replace(`/bible/${nextBook.id}/1`);
    }
  }

  function toggleChapterBookmark() {
    if (isBabBookmarked) {
      removeBookmark(ref, null);
      showToast(t('bible.remove_bookmark'), 'info');
    } else {
      addBookmark({ ref, bookId: book!.id, bab, ayat: null });
      showToast(t('bible.bookmarked'), 'success');
    }
  }

  function shareVerse(verse: BibleVerse) {
    Share.share({
      message: `"${verse.teks}"\n\n— ${book!.nama} ${bab}:${verse.nomor} (TB LAI)`,
    });
  }

  function toggleVerseBookmark(verse: BibleVerse) {
    const verseRef = ref;
    if (isBookmarked(verseRef, verse.nomor)) {
      removeBookmark(verseRef, verse.nomor);
      showToast(t('bible.remove_bookmark'), 'info');
    } else {
      addBookmark({
        ref: verseRef,
        bookId: book!.id,
        bab,
        ayat: verse.nomor,
        preview: verse.teks.slice(0, 120),
      });
      showToast(t('bible.bookmarked'), 'success');
    }
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-purple-600">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">
                {book.nama} {bab}
              </Text>
              <Text className="text-xs text-white/80">TB LAI</Text>
            </View>
            <Pressable
              onPress={() => setShowFontModal(true)}
              className="w-10 h-10 items-center justify-center"
            >
              <Type size={18} color="#fff" />
            </Pressable>
            <Pressable
              onPress={toggleChapterBookmark}
              className="w-10 h-10 items-center justify-center"
            >
              {isBabBookmarked ? (
                <BookmarkCheck size={18} color="#FCD34D" fill="#FCD34D" />
              ) : (
                <Bookmark size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      >
        {chapter ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100">
            {chapter.ayat.map((verse) => {
              const isSelected = selectedVerse === verse.nomor;
              const isVerseBookmarked = isBookmarked(ref, verse.nomor);
              return (
                <View key={verse.nomor}>
                  <Pressable
                    onPress={() =>
                      setSelectedVerse(isSelected ? null : verse.nomor)
                    }
                    className={`mb-3 ${
                      isSelected ? 'bg-purple-50 -mx-2 px-2 py-2 rounded-lg' : ''
                    }`}
                  >
                    <Text className={`${fontClass} text-neutral-900 leading-relaxed`}>
                      <Text className="text-purple-700 font-bold text-xs">
                        {verse.nomor}{' '}
                      </Text>
                      {verse.teks}
                      {isVerseBookmarked ? (
                        <Text className="text-amber-600"> ★</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                  {isSelected ? (
                    <View className="flex-row gap-2 mb-4 -mt-1">
                      <Pressable
                        onPress={() => toggleVerseBookmark(verse)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-amber-50 rounded-lg"
                      >
                        {isVerseBookmarked ? (
                          <BookmarkCheck size={14} color="#D97706" />
                        ) : (
                          <Bookmark size={14} color="#D97706" />
                        )}
                        <Text className="text-xs font-semibold text-amber-700">
                          {isVerseBookmarked
                            ? t('bible.bookmarked')
                            : t('bible.bookmark')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => shareVerse(verse)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-purple-50 rounded-lg"
                      >
                        <Share2 size={14} color="#9333ea" />
                        <Text className="text-xs font-semibold text-purple-700">
                          {t('bible.share')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-6 border border-amber-200 items-center">
            <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-3">
              <Bookmark size={28} color="#D97706" />
            </View>
            <Text className="text-base font-bold text-neutral-900 text-center mb-1">
              {t('bible.sample_only_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center leading-relaxed">
              {t('bible.sample_only_msg')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom prev/next nav */}
      <SafeAreaView edges={['bottom']} className="absolute left-0 right-0 bottom-0 bg-white border-t border-neutral-200">
        <View className="flex-row px-4 py-2">
          <Pressable
            onPress={goPrev}
            disabled={bab === 1 && book.id === 1}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-neutral-100"
          >
            <ChevronLeft size={16} color="#525252" />
            <Text className="text-sm font-semibold text-neutral-700">
              {t('bible.prev_chapter')}
            </Text>
          </Pressable>
          <View style={{ width: 8 }} />
          <Pressable
            onPress={goNext}
            disabled={bab === book.totalBab && book.id === 66}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-purple-600"
          >
            <Text className="text-sm font-semibold text-white">
              {t('bible.next_chapter')}
            </Text>
            <ChevronRight size={16} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Font size modal */}
      <Modal
        visible={showFontModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontModal(false)}
      >
        <Pressable
          onPress={() => setShowFontModal(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <Text className="text-lg font-bold text-neutral-900 mb-3">
              {t('bible.font_size')}
            </Text>
            <View className="gap-2">
              {(['sm', 'md', 'lg', 'xl'] as BibleFontSize[]).map((size) => (
                <Pressable
                  key={size}
                  onPress={() => {
                    setFontSize(size);
                    setShowFontModal(false);
                  }}
                  className={`flex-row items-center justify-between p-3 rounded-xl border ${
                    fontSize === size
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text className={`${FONT_SIZE_MAP[size]} text-neutral-900`}>
                    Aa
                  </Text>
                  <Text className="text-sm font-semibold text-neutral-700 uppercase">
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const FONT_SIZE_MAP: Record<BibleFontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};
