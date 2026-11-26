/**
 * Bagian bersama Detail News & Detail Renungan (relayout 2.5.1): bilah atas
 * yang berubah putih + progres baca saat digulir, waktu baca, paragraf pembuka,
 * tombol Simpan / Bagikan di akhir, dan kartu ayat (teks dari Alkitab offline).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bookmark, Clock, Share2 } from 'lucide-react-native';

import { gx } from '@/theme/gradient';
import { isDark, nc, sb } from '@/theme/ThemeRoot';
import { parseVerseRef } from '@/utils/verseParse';
import { verseRefWithVersion, verseText } from '@/components/bible/verseRef';

/** Perkiraan menit baca (±200 kata/menit, minimal 1). */
export function readingMinutes(...texts: (string | null | undefined)[]): number {
  const words = texts
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Scroll artikel: bilah putih muncul setelah gambar tergulir; progres 0–1. */
export function useArticleScroll(heroH: number) {
  const [state, setState] = useState({ bar: false, progress: 0 });
  const viewH = useRef(0);
  const contentH = useRef(0);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      viewH.current = e.nativeEvent.layoutMeasurement.height;
      contentH.current = e.nativeEvent.contentSize.height;
      const max = Math.max(1, contentH.current - viewH.current);
      const bar = y > heroH - 70;
      const progress = Math.min(1, Math.max(0, y / max));
      setState((s) => (s.bar === bar && Math.abs(s.progress - progress) < 0.01 ? s : { bar, progress }));
    },
    [heroH],
  );
  return { ...state, onScroll };
}

export function ArticleTopBar({
  bar,
  progress,
  title,
  bookmarked,
  onBack,
  onBookmark,
  onShare,
}: {
  bar: boolean;
  progress: number;
  title: string;
  bookmarked: boolean;
  onBack: () => void;
  onBookmark: () => void;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const ink = bar ? nc('#171717') : '#fff';
  const btn = bar ? 'w-10 h-10 rounded-full items-center justify-center' : 'w-10 h-10 rounded-full bg-black/40 items-center justify-center';
  return (
    <>
      <StatusBar style={bar ? sb() : 'light'} />
      <View
        className="absolute top-0 left-0 right-0 z-10"
        pointerEvents="box-none"
        style={bar ? { backgroundColor: isDark() ? '#1C1C1E' : '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: nc('#E5E5E5') } : undefined}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-3 py-2 flex-row items-center gap-2">
            <Pressable onPress={onBack} className={btn} accessibilityLabel={t('common.back')}>
              <ArrowLeft size={20} color={ink} />
            </Pressable>
            <Text className="flex-1 text-[14px] font-bold text-neutral-900" numberOfLines={1} style={{ opacity: bar ? 1 : 0 }}>
              {title}
            </Text>
            <Pressable onPress={onBookmark} className={btn} accessibilityLabel={bookmarked ? t('content.bookmark_remove') : t('content.bookmark_add')}>
              <Bookmark size={18} color={bar && bookmarked ? '#EA580C' : ink} fill={bookmarked ? (bar ? '#EA580C' : '#fff') : 'transparent'} />
            </Pressable>
            <Pressable onPress={onShare} className={btn} accessibilityLabel={t('common.share')}>
              <Share2 size={18} color={ink} />
            </Pressable>
          </View>
        </SafeAreaView>
        {/* Garis progres baca */}
        {bar ? (
          <View style={{ height: 3, backgroundColor: 'transparent' }}>
            <View {...gx('h-full bg-brand-500', { width: `${Math.round(progress * 100)}%` })} />
          </View>
        ) : null}
      </View>
    </>
  );
}

export function ReadTime({ minutes }: { minutes: number }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-1 bg-neutral-100 rounded-full px-2.5 py-1">
      <Clock size={12} color={nc('#525252')} />
      <Text className="text-[11px] font-bold text-neutral-600">{t('content.read_minutes', { count: minutes })}</Text>
    </View>
  );
}

/** Ringkasan sebagai paragraf pembuka dengan garis oranye. */
export function LeadParagraph({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <View className="flex-row gap-3 mt-4">
      <View {...gx('w-[3px] rounded-full bg-brand-500')} />
      <Text className="flex-1 text-[15px] leading-6 font-medium text-neutral-700">{text}</Text>
    </View>
  );
}

export function EndActions({ bookmarked, onBookmark, onShare }: { bookmarked: boolean; onBookmark: () => void; onShare: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-2 mt-5">
      <Pressable onPress={onBookmark} className="flex-1 h-11 rounded-xl border border-neutral-200 bg-card flex-row items-center justify-center gap-1.5 active:opacity-70">
        <Bookmark size={16} color={bookmarked ? '#EA580C' : nc('#404040')} fill={bookmarked ? '#EA580C' : 'transparent'} />
        <Text className="text-[13px] font-bold text-neutral-800">{bookmarked ? t('content.saved') : t('content.save')}</Text>
      </Pressable>
      <Pressable onPress={onShare} {...gx('flex-1 h-11 rounded-xl bg-brand-500 flex-row items-center justify-center gap-1.5')}>
        <Share2 size={16} color="#fff" />
        <Text className="text-[13px] font-bold text-white">{t('common.share')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * "Ayat hari ini" — teks ayat dari Alkitab offline di app (versi sesuai tulisan
 * ayat di konten). Tulisan tidak terbaca / teks belum ada → hanya referensinya.
 */
export function VerseCard({ ayat }: { ayat: string }) {
  const { t } = useTranslation();
  const ref = parseVerseRef(ayat);
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setText(null);
    if (ref) void verseText(ref).then((x) => alive && setText(x)).catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayat]);
  if (!ayat?.trim()) return null;
  return (
    <View className="mt-4 rounded-[18px] px-4 py-3.5 border border-brand-200 bg-brand-50 overflow-hidden">
      <Text style={{ position: 'absolute', right: 12, top: -6, fontSize: 64, fontWeight: '800', color: 'rgba(249,115,22,0.14)' }}>“</Text>
      <Text className="text-[10px] font-extrabold text-brand-700 tracking-widest">{t('content.verse_today')}</Text>
      {text ? <Text className="text-[15px] leading-6 italic text-brand-900 mt-1.5">{text}</Text> : null}
      <Text className={`text-[13px] font-extrabold text-brand-800 ${text ? 'mt-2' : 'mt-1'}`}>{ref && text ? verseRefWithVersion(ref) : ayat}</Text>
    </View>
  );
}
