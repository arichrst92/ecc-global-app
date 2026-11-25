/**
 * Tab Video Channel di layar Media (2.5.1): video unggulan, pilihan kategori,
 * cari judul, daftar video (terbaru dulu). Ketuk → /media/video/:id.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Play, Search, X } from 'lucide-react-native';

import { TextInput } from '@/components/ui/ThemedTextInput';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { useVideoCatalog } from '@/hooks/useVideos';
import type { VideoItem } from '@/api/videos';
import { ApiError } from '@/types/api';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export const fmtVideoDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function VideoThumb({ v, radius = 12 }: { v: VideoItem; radius?: number }) {
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius, overflow: 'hidden' }} className="bg-neutral-200">
      <Image source={{ uri: v.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </View>
  );
}

export function VideoRow({ v, onPress }: { v: VideoItem; onPress: () => void }) {
  const { i18n } = useTranslation();
  return (
    <Pressable onPress={onPress} className="flex-row gap-3 active:opacity-80">
      <View style={{ width: 150 }}>
        <VideoThumb v={v} radius={10} />
      </View>
      <View className="flex-1 min-w-0 py-0.5">
        <Text className="text-sm font-semibold text-neutral-900" numberOfLines={3}>
          {v.judul}
        </Text>
        <Text className="text-[11px] text-neutral-500 mt-1" numberOfLines={1}>
          {[v.kategori?.nama, fmtVideoDate(v.tayangAt, i18n.language)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const PAGE = 30;

export function VideoChannelView() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const q = useVideoCatalog();
  const [kat, setKat] = useState<string>('all');
  const [search, setSearch] = useState<string | null>(null);
  // Video bisa ratusan (hasil sinkron channel) → tampil bertahap 30 per gulir.
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [kat, search]);
  const d = q.data;
  const open = (v: VideoItem) => router.push(`/media/video/${v.id}` as never);

  const list = useMemo(() => {
    const all = d?.videos ?? [];
    const s = (search ?? '').trim().toLowerCase();
    if (search !== null) return s ? all.filter((v) => `${v.judul} ${v.kategori?.nama ?? ''}`.toLowerCase().includes(s)) : [];
    return kat === 'all' ? all : all.filter((v) => v.kategori?.id === kat);
  }, [d, kat, search]);

  const chips = [{ id: 'all', nama: t('media.all') }, ...(d?.kategori ?? [])];
  const featW = Math.min(width - 48, 520);

  return (
    <View className="flex-1">
      <View className="bg-card border-b border-neutral-100">
        {search === null ? (
          <View className="flex-row items-center">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 10, gap: 8, alignItems: 'center' }}>
            {chips.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setKat(c.id)}
                {...gx(`px-3.5 py-1.5 rounded-full border ${kat === c.id ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-300'}`)}
              >
                <Text className={`text-xs font-semibold ${kat === c.id ? 'text-white' : 'text-neutral-700'}`}>{c.nama}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {/* Cari selalu terlihat di kanan walau kategori banyak. */}
          <Pressable onPress={() => setSearch('')} className="w-11 h-10 items-center justify-center border-l border-neutral-100" hitSlop={4}>
            <Search size={18} color={nc('#171717')} />
          </Pressable>
          </View>
        ) : (
          <View className="px-4 py-2 flex-row items-center gap-2">
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder={t('media.search_ph')}
              placeholderTextColor={nc('#A3A3A3')}
              className="flex-1 bg-neutral-100 rounded-xl px-3 py-2 text-sm text-neutral-900"
            />
            <Pressable onPress={() => setSearch(null)} className="w-10 h-10 items-center justify-center">
              <X size={20} color={nc('#171717')} />
            </Pressable>
          </View>
        )}
      </View>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : q.isError ? (
        <Text className="text-sm text-red-600 text-center p-8">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 120, gap: 14 }}
          refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
          scrollEventThrottle={200}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            if (limit < list.length && layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) setLimit((n) => n + PAGE);
          }}
        >
          {search === null && kat === 'all' && (d?.featured.length ?? 0) > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-bold text-neutral-900 px-4">{t('media.featured')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} snapToInterval={featW + 12} decelerationRate="fast">
                {d!.featured.map((v) => (
                  <Pressable key={v.id} onPress={() => open(v)} style={{ width: featW }} className="active:opacity-80">
                    <VideoThumb v={v} radius={14} />
                    <Text className="text-sm font-semibold text-neutral-900 mt-1.5" numberOfLines={2}>
                      {v.judul}
                    </Text>
                    <Text className="text-[11px] text-neutral-500">{[v.kategori?.nama, fmtVideoDate(v.tayangAt, i18n.language)].filter(Boolean).join(' · ')}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View className="px-4 gap-3">
            {search === null && kat === 'all' && (d?.featured.length ?? 0) > 0 && list.length ? (
              <Text className="text-sm font-bold text-neutral-900">{t('media.latest')}</Text>
            ) : null}
            {list.length ? (
              list.slice(0, limit).map((v) => <VideoRow key={v.id} v={v} onPress={() => open(v)} />)
            ) : (
              <Text className="text-sm text-neutral-400 text-center mt-10">
                {search !== null ? (search.trim() ? t('media.search_empty') : t('media.search_hint')) : t('media.empty')}
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
