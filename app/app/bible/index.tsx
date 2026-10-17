import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Share2,
  Sparkles,
} from 'lucide-react-native';

import { useBibleStore } from '@/stores/bible.store';
import {
  BIBLE_BOOK_BY_ID,
  NT_BOOKS,
  OT_BOOKS,
} from '@/data/bible-books';
import { getVerseOfDay } from '@/data/bible-verses-of-day';
import { BIBLE_VERSIONS, BIBLE_VERSION_BY_CODE, getVerse, preloadVersion } from '@/data/bible';
import { useBookNames } from '@/utils/bibleNames';
import type { BibleBook, Testament } from '@/types/bible';
import { goBack } from '@/utils/nav';

/**
 * Bible home — verse of day + continue reading + browse OT/NT + bookmarks.
 *
 * Bundle full content: BIMK (Indonesian) + KJV (English). Verse of day teks
 * fall back ke curated text di bible-verses-of-day.ts kalau bundled version
 * tidak punya ayat-nya.
 */
export default function BibleHomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const lastRead = useBibleStore((s) => s.lastRead);
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const selectedVersionCode = useBibleStore((s) => s.selectedVersionCode);
  const setSelectedVersion = useBibleStore((s) => s.setSelectedVersion);
  const versionMeta = BIBLE_VERSION_BY_CODE.get(selectedVersionCode);
  const names = useBookNames();

  // Preload versi terpilih di background supaya UX tidak lag saat user tap
  // chapter pertama kali (versi JSON di-lazy-load — lihat src/data/bible/index.ts).
  useEffect(() => {
    preloadVersion(selectedVersionCode);
  }, [selectedVersionCode]);

  // Pakai teks dari bundled version kalau available; fall back ke curated text
  const verseOfDayBase = useMemo(() => getVerseOfDay(), []);
  const [verseOfDay, setVerseOfDay] = useState(verseOfDayBase);

  useEffect(() => {
    let cancelled = false;
    getVerse(
      selectedVersionCode,
      verseOfDayBase.bookId,
      verseOfDayBase.bab,
      verseOfDayBase.ayat,
    ).then((fromBundle) => {
      if (!cancelled) {
        setVerseOfDay({
          ...verseOfDayBase,
          teks: fromBundle?.teks ?? verseOfDayBase.teks,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVersionCode, verseOfDayBase]);

  const [tab, setTab] = useState<Testament>('NT');

  function shareVerse() {
    const book = BIBLE_BOOK_BY_ID.get(verseOfDay.bookId);
    if (!book) return;
    const versionLabel = versionMeta?.shortName ?? selectedVersionCode;
    Share.share({
      message: `"${verseOfDay.teks}"\n\n— ${names.name(book)} ${verseOfDay.bab}:${verseOfDay.ayat} (${versionLabel})\n\n${t('common.share_signature')}`,
    });
  }

  const lastReadBook = lastRead ? BIBLE_BOOK_BY_ID.get(lastRead.bookId) : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => goBack(router)}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">{t('bible.title')}</Text>
              <Text className="text-xs text-white/80">{t('bible.subtitle')}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Versi Alkitab — dipilih di sini (berlaku untuk semua bacaan) */}
        <View className="bg-white rounded-2xl p-3 border border-neutral-100 mb-4">
          <View className="flex-row items-center gap-2 mb-2 px-1">
            <Languages size={14} color="#EA580C" />
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('bible.choose_version')}</Text>
          </View>
          <View className="flex-row gap-2">
            {BIBLE_VERSIONS.map((v) => {
              const active = v.code === selectedVersionCode;
              return (
                <Pressable
                  key={v.code}
                  onPress={() => setSelectedVersion(v.code)}
                  className={`flex-1 rounded-xl px-3 py-2.5 border ${active ? 'bg-brand-50 border-brand-400' : 'bg-white border-neutral-200'}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${active ? 'text-brand-700' : 'text-neutral-800'}`}>{v.shortName}</Text>
                    {active ? <Check size={16} color="#EA580C" /> : null}
                  </View>
                  <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={1}>
                    {v.fullName}
                  </Text>
                  <Text className="text-[10px] text-neutral-400 mt-0.5">
                    {v.language === 'en' ? 'English' : 'Bahasa Indonesia'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Verse of day */}
        <View className="bg-white rounded-2xl p-5 border border-brand-100 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Sparkles size={16} color="#EA580C" />
            <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">
              {t('bible.verse_of_day')}
            </Text>
          </View>
          <Text className="text-base text-neutral-800 leading-relaxed italic">
            "{verseOfDay.teks}"
          </Text>
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-100">
            <Pressable
              onPress={() => {
                const book = BIBLE_BOOK_BY_ID.get(verseOfDay.bookId);
                if (book) router.push(`/bible/${book.id}/${verseOfDay.bab}`);
              }}
            >
              <Text className="text-sm font-bold text-brand-700">
                {(() => { const b = BIBLE_BOOK_BY_ID.get(verseOfDay.bookId); return b ? names.name(b) : ''; })()} {verseOfDay.bab}:
                {verseOfDay.ayat}
              </Text>
            </Pressable>
            <Pressable
              onPress={shareVerse}
              className="w-9 h-9 rounded-full bg-brand-50 items-center justify-center"
            >
              <Share2 size={16} color="#EA580C" />
            </Pressable>
          </View>
        </View>

        {/* Continue reading */}
        {lastRead && lastReadBook ? (
          <Pressable
            onPress={() => router.push(`/bible/${lastRead.bookId}/${lastRead.bab}`)}
            className="bg-brand-500 rounded-2xl p-4 flex-row items-center gap-3 mb-4"
          >
            <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
              <BookOpen size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-white/80">{t('bible.continue_reading')}</Text>
              <Text className="text-base font-bold text-white">
                {names.name(lastReadBook)} {lastRead.bab}
              </Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </Pressable>
        ) : null}

        {/* Bookmarks */}
        {bookmarks.length > 0 ? (
          <Pressable
            onPress={() => router.push('/bible/bookmarks')}
            className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100 mb-4"
          >
            <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center">
              <Bookmark size={22} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-neutral-900">
                {t('bible.bookmarks_title')}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {bookmarks.length} {t('bible.bookmark').toLowerCase()}
              </Text>
            </View>
            <ChevronRight size={16} color="#A3A3A3" />
          </Pressable>
        ) : null}

        {/* OT/NT tabs */}
        <View className="flex-row bg-white rounded-2xl p-1 border border-neutral-100 mb-3">
          <Pressable
            onPress={() => setTab('OT')}
            className={`flex-1 py-2.5 items-center rounded-xl ${
              tab === 'OT' ? 'bg-brand-500' : ''
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                tab === 'OT' ? 'text-white' : 'text-neutral-600'
              }`}
            >
              {t('bible.browse_ot')} · {OT_BOOKS.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('NT')}
            className={`flex-1 py-2.5 items-center rounded-xl ${
              tab === 'NT' ? 'bg-brand-500' : ''
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                tab === 'NT' ? 'text-white' : 'text-neutral-600'
              }`}
            >
              {t('bible.browse_nt')} · {NT_BOOKS.length}
            </Text>
          </Pressable>
        </View>

        {/* Books list */}
        <View className="gap-1.5">
          {(tab === 'OT' ? OT_BOOKS : NT_BOOKS).map((book) => (
            <BookRow
              key={book.id}
              book={book}
              onPress={() => router.push(`/bible/${book.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BookRow({ book, onPress }: { book: BibleBook; onPress: () => void }) {
  const { t } = useTranslation();
  const names = useBookNames();
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl px-4 py-3 flex-row items-center gap-3 border border-neutral-100"
    >
      <View className="w-9 h-9 rounded-lg bg-brand-50 items-center justify-center">
        <Text className="text-[10px] font-bold text-brand-700" numberOfLines={1}>{names.abbr(book)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-900">{names.name(book)}</Text>
        <Text className="text-xs text-neutral-500 mt-0.5">
          {t('bible.chapters_count', { count: book.totalBab })}
        </Text>
      </View>
      <ChevronRight size={14} color="#A3A3A3" />
    </Pressable>
  );
}
