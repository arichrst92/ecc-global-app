/**
 * Catatan saya (2.4.5) — dari Profil. Catatan khotbah + jurnal Bible 365,
 * semuanya PRIBADI. Filter: Semua · Khotbah · Bible 365.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Lock, Mic, NotebookPen, Plus, Search, X } from 'lucide-react-native';

import { CATATAN_KEY, listCatatan, type Catatan } from '@/api/catatan';
import { listBible365Notes, type Bible365JournalItem } from '@/api/bible365';
import { BIBLE_BOOK_BY_ID } from '@/data/bible-books';
import { useBookNames } from '@/utils/bibleNames';
import { plainText } from '@/utils/catatanMarkdown';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

type Filter = 'all' | 'khotbah' | 'b365';
type Row = { kind: 'k'; date: string; key: string; n: Catatan } | { kind: 'b'; date: string; key: string; n: Bible365JournalItem };

export default function CatatanListScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const names = useBookNames();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(h);
  }, [search]);

  const k = useInfiniteQuery({
    queryKey: [...CATATAN_KEY, 'list', q],
    queryFn: ({ pageParam }) => listCatatan(pageParam, q),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: filter !== 'b365',
  });
  const b = useInfiniteQuery({
    queryKey: ['bible365', 'journal'],
    queryFn: ({ pageParam }) => listBible365Notes(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: filter !== 'khotbah',
  });
  const refresh = () => Promise.all([filter !== 'b365' ? k.refetch() : null, filter !== 'khotbah' ? b.refetch() : null]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (filter !== 'b365') for (const n of k.data?.pages.flatMap((p) => p.items) ?? []) out.push({ kind: 'k', date: n.tanggal, key: `k${n.id}`, n });
    if (filter !== 'khotbah') {
      const needle = q.toLowerCase();
      for (const n of b.data?.pages.flatMap((p) => p.items) ?? []) {
        if (needle && !n.isi.toLowerCase().includes(needle)) continue;
        out.push({ kind: 'b', date: n.date, key: `b${n.day}`, n });
      }
    }
    return out.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
  }, [filter, k.data, b.data, q]);

  const loading = (filter !== 'b365' && k.isPending) || (filter !== 'khotbah' && b.isPending);
  function more() {
    if (filter !== 'b365' && k.hasNextPage && !k.isFetchingNextPage) k.fetchNextPage();
    if (filter !== 'khotbah' && b.hasNextPage && !b.isFetchingNextPage) b.fetchNextPage();
  }
  const chapLabel = (c: { bookId: number; bab: number }) => {
    const bk = BIBLE_BOOK_BY_ID.get(c.bookId);
    return bk ? `${names.name(bk)} ${c.bab}` : '';
  };

  const FILTERS: { v: Filter; label: string }[] = [
    { v: 'all', label: t('catatan.filter_all') },
    { v: 'khotbah', label: t('catatan.filter_khotbah') },
    { v: 'b365', label: t('catatan.filter_b365') },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-2 pt-2 flex-row items-center">
          <Pressable onPress={() => goBack(router, '/(tabs)/profile')} className="w-10 h-10 items-center justify-center" accessibilityLabel={t('common.back')}>
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('catatan.title')}</Text>
            <View className="flex-row items-center gap-1">
              <Lock size={10} color={nc('#737373')} />
              <Text className="text-[11px] text-neutral-500">{t('catatan.subtitle')}</Text>
            </View>
          </View>
        </View>
        <View className="px-4 pt-2 pb-3 gap-2">
          <View className="flex-row items-center gap-2 bg-neutral-100 rounded-xl px-3">
            <Search size={15} color={nc('#737373')} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('catatan.search_placeholder')}
              placeholderTextColor={nc('#A3A3A3')}
              className="flex-1 py-2.5 text-sm text-neutral-900"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <X size={15} color={nc('#737373')} />
              </Pressable>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            {FILTERS.map((f) => (
              <Pressable
                key={f.v}
                onPress={() => setFilter(f.v)}
                className={`px-3.5 py-1.5 rounded-full border ${filter === f.v ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
              >
                <Text className={`text-xs font-semibold ${filter === f.v ? 'text-white' : 'text-neutral-700'}`}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        refreshControl={<PullRefreshControl onRefresh={refresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 10 }}
        onEndReached={more}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#EA580C" style={{ marginTop: 40 }} />
          ) : (
            <View className="items-center py-16 px-8">
              <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
                <NotebookPen size={28} color={nc('#A3A3A3')} />
              </View>
              <Text className="text-sm font-bold text-neutral-900">{q ? t('catatan.search_empty') : t('catatan.empty')}</Text>
              {q ? null : <Text className="text-xs text-neutral-500 text-center mt-1">{t('catatan.empty_body')}</Text>}
            </View>
          )
        }
        renderItem={({ item }) =>
          item.kind === 'k' ? (
            <Pressable onPress={() => router.push(`/catatan/${item.n.id}` as never)} className="bg-card rounded-2xl border border-neutral-100 p-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-1.5 bg-violet-50 rounded-full px-2 py-0.5">
                  <Mic size={10} color="#7C3AED" />
                  <Text className="text-[10px] font-bold text-violet-700">{t('catatan.badge_khotbah')}</Text>
                </View>
                <Text className="text-[11px] text-neutral-400">{formatDateWithDay(item.n.tanggal, i18n.language)}</Text>
              </View>
              <Text className="text-base font-bold text-neutral-900 mt-2" numberOfLines={2}>
                {item.n.judul}
              </Text>
              {item.n.pengkhotbah ? <Text className="text-xs text-neutral-500 mt-0.5">{item.n.pengkhotbah}</Text> : null}
              {item.n.isi.trim() ? (
                <Text className="text-sm text-neutral-700 mt-2 leading-relaxed" numberOfLines={3}>
                  {plainText(item.n.isi)}
                </Text>
              ) : null}
              {item.n.ayat.length ? (
                <View className="flex-row items-center gap-1 mt-2">
                  <BookOpen size={11} color="#C2410C" />
                  <Text className="text-xs font-semibold text-brand-700 flex-1" numberOfLines={1}>
                    {item.n.ayat.join(' · ')}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push(`/bible365/note?day=${item.n.day}` as never)} className="bg-card rounded-2xl border border-neutral-100 p-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-1.5 bg-brand-50 rounded-full px-2 py-0.5">
                  <BookOpen size={10} color="#C2410C" />
                  <Text className="text-[10px] font-bold text-brand-700">{t('catatan.badge_b365', { day: item.n.day })}</Text>
                </View>
                <Text className="text-[11px] text-neutral-400">{formatDateWithDay(item.n.date, i18n.language)}</Text>
              </View>
              <Text className="text-[11px] text-neutral-500 mt-2" numberOfLines={1}>
                {item.n.chapters.map(chapLabel).filter(Boolean).join(' · ')}
              </Text>
              <Text className="text-sm text-neutral-800 mt-1 leading-relaxed" numberOfLines={3}>
                {item.n.isi}
              </Text>
            </Pressable>
          )
        }
      />

      {filter !== 'b365' ? (
        <View className="absolute right-5" style={{ bottom: insets.bottom + 20 }}>
          <Pressable
            onPress={() => router.push('/catatan/edit' as never)}
            {...gx('flex-row items-center gap-2 bg-brand-500 rounded-full px-5 py-3.5 shadow-lg')}
          >
            <Plus size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('catatan.new_btn')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
