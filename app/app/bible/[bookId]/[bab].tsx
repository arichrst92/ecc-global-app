import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  NotebookPen,
  Share2,
  Type,
  X,
} from 'lucide-react-native';
import { useCatatanBridge } from '@/stores/catatanBridge.store';

import { useToast } from '@/components/ui/Toast';
import { openShareCard } from '@/features/share/shareStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react-native';
import { BIBLE365_KEY, markBible365Read } from '@/api/bible365';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { bookName, useBookNames } from '@/utils/bibleNames';
import {
  BIBLE_VERSION_BY_CODE,
  getChapter,
} from '@/data/bible';
import { useAuthStore } from '@/stores/auth.store';
import { useBibleStore } from '@/stores/bible.store';
import type {
  BibleChapter,
  BibleFontSize,
  BibleVerse,
  BibleVersionCode,
} from '@/types/bible';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

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
  const params = useLocalSearchParams<{ bookId: string; bab: string; b365?: string }>();
  // Dibuka dari Bible 365 → tampil tombol "Tandai selesai dibaca".
  const fromB365 = params.b365 === '1';
  const b365q = fromB365 ? '?b365=1' : '';
  const bookId = Number(params.bookId);
  const bab = Number(params.bab);
  const book = BIBLE_BOOK_BY_ID.get(bookId);
  const names = useBookNames();
  const showToast = useToast((s) => s.show);
  const isGuest = useAuthStore((s) => s.isGuest);

  const fontSize = useBibleStore((s) => s.fontSize);
  const setFontSize = useBibleStore((s) => s.setFontSize);
  const setLastRead = useBibleStore((s) => s.setLastRead);
  const addBookmark = useBibleStore((s) => s.addBookmark);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);
  const addBookmarks = useBibleStore((s) => s.addBookmarks);
  const removeBookmarks = useBibleStore((s) => s.removeBookmarks);
  const isBookmarked = useBibleStore((s) => s.isBookmarked);
  // Langganan daftar penanda supaya tanda ★ ikut berubah setelah aksi massal.
  useBibleStore((s) => s.bookmarks);
  const selectedVersionCode = useBibleStore((s) => s.selectedVersionCode);

  // 2.4.6 — bisa memilih beberapa ayat sekaligus (tandai / catatan / bagikan).
  const [selected, setSelected] = useState<number[]>([]);
  useEffect(() => setSelected([]), [bookId, bab]);
  const catatanEditorsOpen = useCatatanBridge((s) => s.editorsOpen);
  const pushToCatatan = useCatatanBridge((s) => s.push);
  const [showFontModal, setShowFontModal] = useState(false);

  const ref = book ? `${book.singkatan.toUpperCase()} ${bab}` : '';
  const versionMeta = BIBLE_VERSION_BY_CODE.get(selectedVersionCode);

  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);

  useEffect(() => {
    if (book) {
      setLastRead(ref, book.id, bab);
    }
  }, [ref, book, bab, setLastRead]);

  // Chapter content di-lazy-load per versi (lihat src/data/bible/index.ts) —
  // load async supaya versi lain yang belum pernah dibuka tidak ikut ter-load.
  useEffect(() => {
    let cancelled = false;
    if (!book) {
      setChapter(null);
      setIsLoadingChapter(false);
      return;
    }
    setIsLoadingChapter(true);
    getChapter(selectedVersionCode, book.id, bab).then((result) => {
      if (!cancelled) {
        setChapter(result);
        setIsLoadingChapter(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVersionCode, book, bab]);

  // Bible 365 — hook harus di atas early return.
  const qcB365 = useQueryClient();
  const [b365Done, setB365Done] = useState(false);
  useEffect(() => setB365Done(false), [bookId, bab]);
  const markRead = useMutation({
    mutationFn: () => markBible365Read(bookId, bab, true),
    onSuccess: () => {
      setB365Done(true);
      void qcB365.invalidateQueries({ queryKey: BIBLE365_KEY });
    },
    onError: () => showToast(t('error.generic'), 'error'),
  });

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
      router.replace(`/bible/${book!.id}/${bab - 1}${b365q}`);
    } else if (book!.id > 1) {
      const prevBook = BIBLE_BOOK_BY_ID.get(book!.id - 1);
      if (prevBook) router.replace(`/bible/${prevBook.id}/${prevBook.totalBab}${b365q}`);
    }
  }

  function goNext() {
    if (bab < book!.totalBab) {
      router.replace(`/bible/${book!.id}/${bab + 1}${b365q}`);
    } else if (book!.id < 66) {
      const nextBook = BIBLE_BOOK_BY_ID.get(book!.id + 1);
      if (nextBook) router.replace(`/bible/${nextBook.id}/1${b365q}`);
    }
  }

  function toggleChapterBookmark() {
    // Bookmark keyed per-jemaatId di store. Guest tidak punya jemaatId → store
    // silently no-op. Tanpa gate ini, toast "bookmarked" tampil false-positive
    // padahal bookmark tidak tersimpan.
    if (isGuest) {
      showToast(t('bible.login_required_bookmark'), 'info');
      return;
    }
    if (isBabBookmarked) {
      removeBookmark(ref, null);
      showToast(t('bible.remove_bookmark'), 'info');
    } else {
      addBookmark({
        ref,
        bookId: book!.id,
        bab,
        ayat: null,
        versionCode: selectedVersionCode,
      });
      showToast(t('bible.bookmarked'), 'success');
    }
  }

  /** Ayat terpilih, urut nomor. */
  const selectedVerses = (chapter?.ayat ?? []).filter((v) => selected.includes(v.nomor));

  /** "1-3, 5, 7-8" dari ayat terpilih (ayat gabungan memakai nomorEnd). */
  function verseRangeLabel(vs: BibleVerse[]): string {
    const nums: number[] = [];
    for (const v of vs) {
      const end = v.nomorEnd && v.nomorEnd > v.nomor ? v.nomorEnd : v.nomor;
      for (let n = v.nomor; n <= end; n++) nums.push(n);
    }
    const out: string[] = [];
    let i = 0;
    while (i < nums.length) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j]! + 1) j++;
      out.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
      i = j + 1;
    }
    return out.join(', ');
  }

  function toggleSelect(nomor: number) {
    setSelected((cur) => (cur.includes(nomor) ? cur.filter((n) => n !== nomor) : [...cur, nomor].sort((a, b) => a - b)));
  }

  function shareSelected() {
    if (!selectedVerses.length) return;
    const versionLabel = versionMeta?.shortName ?? selectedVersionCode;
    const r = `${bookName(book!, selectedVersionCode)} ${bab}:${verseRangeLabel(selectedVerses)}`;
    const text =
      selectedVerses.length === 1
        ? selectedVerses[0]!.teks
        : selectedVerses.map((v) => `${v.nomor} ${v.teks}`).join(' ');
    openShareCard({
      kind: 'verse',
      label: t('sharecard.label_bible'),
      text,
      reference: `${r} · ${versionLabel}`,
      caption: `"${text}"\n\n— ${r} (${versionLabel})\n\n${t('common.share_signature')}`,
    });
  }

  /** Ayat terpilih → Catatan saya. Editor sedang terbuka → titip ke editor; selain itu buka catatan baru. */
  function selectedToCatatan() {
    if (isGuest) {
      showToast(t('catatan.login_required'), 'info');
      return;
    }
    if (!selectedVerses.length) return;
    const r = `${bookName(book!, selectedVersionCode)} ${bab}:${verseRangeLabel(selectedVerses)}`;
    const versionLabel = versionMeta?.shortName ?? selectedVersionCode;
    const isi =
      selectedVerses.length === 1
        ? selectedVerses[0]!.teks
        : selectedVerses.map((v) => `(${v.nomor}) ${v.teks}`).join(' ');
    const quote = `> "${isi}" — ${r} (${versionLabel})`;
    setSelected([]);
    if (catatanEditorsOpen > 0) {
      pushToCatatan({ ref: r, quote });
      showToast(t('catatan.ayat_queued'), 'success');
      return;
    }
    router.push(`/catatan/edit?ref=${encodeURIComponent(r)}&quote=${encodeURIComponent(quote)}` as never);
  }

  /** Semua terpilih sudah ditandai → hapus penandanya; selain itu tandai semua. */
  function bookmarkSelected() {
    if (isGuest) {
      showToast(t('bible.login_required_bookmark'), 'info');
      return;
    }
    if (!selectedVerses.length) return;
    const allMarked = selectedVerses.every((v) => isBookmarked(ref, v.nomor));
    if (allMarked) {
      void removeBookmarks(selectedVerses.map((v) => ({ ref, ayat: v.nomor })));
      showToast(t('bible.remove_bookmark'), 'info');
    } else {
      void addBookmarks(
        selectedVerses.map((v) => ({
          ref,
          bookId: book!.id,
          bab,
          ayat: v.nomor,
          preview: v.teks.slice(0, 120),
          versionCode: selectedVersionCode,
        })),
      );
      showToast(
        selectedVerses.length > 1 ? t('bible.bookmarked_n', { count: selectedVerses.length }) : t('bible.bookmarked'),
        'success',
      );
    }
    setSelected([]);
  }

  const selAllMarked = selectedVerses.length > 0 && selectedVerses.every((v) => isBookmarked(ref, v.nomor));

  return (
    <View className="flex-1 bg-neutral-50">
      <View {...gx('bg-brand-500')}>
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => goBack(router)}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">
                {bookName(book, selectedVersionCode)} {bab}
              </Text>
              <Text className="text-xs text-white/80">
                {versionMeta?.shortName ?? selectedVersionCode} ·{' '}
                {versionMeta?.fullName ?? ''}
              </Text>
            </View>
            {isGuest ? null : (
              <Pressable
                onPress={() => router.push('/catatan/edit' as never)}
                className="w-10 h-10 items-center justify-center"
                accessibilityLabel={t('catatan.sermon_btn')}
              >
                <NotebookPen size={18} color="#fff" />
              </Pressable>
            )}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: (fromB365 ? 160 : 100) + (selected.length ? 64 : 0) }}
      >
        {isLoadingChapter ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#EA580C" />
          </View>
        ) : chapter ? (
          <View className="bg-card rounded-2xl p-5 border border-neutral-100">
            {chapter.ayat.map((verse) => {
              const isSelected = selected.includes(verse.nomor);
              const isVerseBookmarked = isBookmarked(ref, verse.nomor);
              return (
                <View key={verse.nomor}>
                  <Pressable
                    onPress={() => toggleSelect(verse.nomor)}
                    className={`mb-3 ${
                      isSelected ? 'bg-brand-50 -mx-2 px-2 py-2 rounded-lg' : ''
                    }`}
                  >
                    <Text className={`${fontClass} text-neutral-900 leading-relaxed`}>
                      <Text className="text-brand-700 font-bold text-xs">
                        {verse.nomorEnd && verse.nomorEnd > verse.nomor
                          ? `${verse.nomor}-${verse.nomorEnd}`
                          : verse.nomor}{' '}
                      </Text>
                      {verse.teks}
                      {isVerseBookmarked ? (
                        <Text className="text-amber-600"> ★</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-card rounded-2xl p-6 border border-neutral-200 items-center">
            <Text className="text-sm text-neutral-500 text-center">
              {names.tc('bible.chapter_not_found')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom prev/next nav */}
      <SafeAreaView edges={['bottom']} className="absolute left-0 right-0 bottom-0 bg-card border-t border-neutral-200">
        {selected.length > 0 ? (
          <View className="px-4 pt-2 flex-row items-center gap-2">
            <Pressable
              onPress={() => setSelected([])}
              className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
              accessibilityLabel={t('common.cancel')}
            >
              <X size={16} color={nc('#525252')} />
            </Pressable>
            <Text className="text-xs font-semibold text-neutral-700 mr-1" numberOfLines={1}>
              {t('bible.selected_n', { count: selected.length })}
            </Text>
            <Pressable
              onPress={bookmarkSelected}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-amber-50 rounded-lg"
            >
              {selAllMarked ? <BookmarkCheck size={14} color="#D97706" /> : <Bookmark size={14} color="#D97706" />}
              <Text className="text-xs font-semibold text-amber-700">
                {selAllMarked ? t('bible.remove_bookmark') : t('bible.bookmark')}
              </Text>
            </Pressable>
            <Pressable
              onPress={selectedToCatatan}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-violet-50 rounded-lg"
            >
              <NotebookPen size={14} color="#7C3AED" />
              <Text className="text-xs font-semibold text-violet-700">{t('catatan.to_note')}</Text>
            </Pressable>
            <Pressable
              onPress={shareSelected}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-brand-50 rounded-lg"
            >
              <Share2 size={14} color="#EA580C" />
              <Text className="text-xs font-semibold text-brand-700">{t('bible.share')}</Text>
            </Pressable>
          </View>
        ) : null}
        {fromB365 && !isGuest ? (
          <View className="px-4 pt-2">
            <Pressable
              onPress={() => !b365Done && markRead.mutate()}
              disabled={markRead.isPending || b365Done}
              className={`flex-row items-center justify-center gap-2 py-2.5 rounded-xl border ${b365Done ? 'bg-emerald-50 border-emerald-200' : 'bg-brand-50 border-brand-200'}`}
            >
              <CheckCircle2 size={16} color={b365Done ? '#059669' : '#EA580C'} />
              <Text className={`text-sm font-bold ${b365Done ? 'text-emerald-700' : 'text-brand-700'}`}>
                {b365Done ? t('b365.chapter_done') : t('b365.mark_chapter')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        <View className="flex-row px-4 py-2">
          <Pressable
            onPress={goPrev}
            disabled={bab === 1 && book.id === 1}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-neutral-100"
          >
            <ChevronLeft size={16} color={nc('#525252')} />
            <Text className="text-sm font-semibold text-neutral-700">
              {names.tc('bible.prev_chapter')}
            </Text>
          </Pressable>
          <View style={{ width: 8 }} />
          <Pressable
            onPress={goNext}
            disabled={bab === book.totalBab && book.id === 66}
            {...gx('flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-500')}
          >
            <Text className="text-sm font-semibold text-white">
              {names.tc('bible.next_chapter')}
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
            className="bg-card rounded-2xl p-5 w-full max-w-sm"
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
                      ? 'bg-brand-50 border-brand-300'
                      : 'bg-card border-neutral-200'
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
