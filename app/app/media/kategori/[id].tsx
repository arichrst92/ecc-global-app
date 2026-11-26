/**
 * Halaman kategori Video Channel (2.5.1) — dari "Lihat semua" / chip kategori.
 * id = id kategori, atau "all" (semua video terbaru).
 * Header gradien ECC + jumlah video; saring Terbaru / Terlama / tahun.
 * Video pertama tampil besar, sisanya baris ringkas (bertahap 30 per gulir).
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search } from 'lucide-react-native';

import { VideoRow, VideoThumb, fmtVideoDate, videoMeta } from '@/components/video/VideoChannelView';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { useVideoCatalog } from '@/hooks/useVideos';
import type { VideoItem } from '@/api/videos';
import { ApiError } from '@/types/api';
import { gx } from '@/theme/gradient';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const PAGE = 30;
type Sort = 'new' | 'old' | number;

export default function VideoKategoriScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const q = useVideoCatalog();
  const d = q.data;
  const [sort, setSort] = useState<Sort>('new');
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [sort]);

  const kat = id === 'all' ? null : (d?.kategori.find((k) => k.id === id) ?? null);
  const title = kat?.nama ?? t('media.all_videos');
  const base = useMemo(
    () => (d?.videos ?? []).filter((v) => id === 'all' || v.kategori?.id === id),
    [d, id],
  );
  const years = useMemo(
    () => [...new Set(base.map((v) => new Date(v.tayangAt).getFullYear()))].sort((a, b) => b - a),
    [base],
  );
  const list = useMemo(() => {
    if (sort === 'old') return [...base].reverse();
    if (typeof sort === 'number') return base.filter((v) => new Date(v.tayangAt).getFullYear() === sort);
    return base;
  }, [base, sort]);
  const open = (v: VideoItem) => router.push(`/media/video/${v.id}` as never);
  const chips: { k: Sort; label: string }[] = [
    { k: 'new', label: t('media.sort_new') },
    { k: 'old', label: t('media.sort_old') },
    ...(years.length > 1 ? years.map((y) => ({ k: y as Sort, label: String(y) })) : []),
  ];
  const [first, ...rest] = list;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-neutral-50">
        <View className="px-3.5 pt-1 pb-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-[17px] font-extrabold text-neutral-900 flex-1" numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={() => router.push('/media/search' as never)} className="w-9 h-9 items-center justify-center" hitSlop={4}>
            <Search size={19} color={nc('#171717')} />
          </Pressable>
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : q.isError ? (
        <Text className="text-sm text-red-600 text-center p-8">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
          scrollEventThrottle={200}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            if (limit < list.length && layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) setLimit((n) => n + PAGE);
          }}
        >
          {/* Header kategori (gradien ECC) */}
          <View {...gx('mx-4 rounded-[20px] p-[18px] bg-brand-500 overflow-hidden')}>
            <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Text className="text-[22px] font-extrabold text-white" numberOfLines={2}>
              {title}
            </Text>
            <Text className="text-xs mt-1" style={{ color: '#FFEDD5' }}>
              {base.length
                ? t('media.cat_count', { count: base.length, date: fmtVideoDate(base[0].tayangAt, i18n.language) })
                : t('media.empty')}
            </Text>
          </View>

          {base.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 8 }}>
              {chips.map((c) => {
                const on = sort === c.k;
                return (
                  <Pressable
                    key={String(c.k)}
                    onPress={() => setSort(c.k)}
                    className={`px-[13px] py-[7px] rounded-full border ${on ? 'bg-neutral-900 border-neutral-900' : 'bg-card border-neutral-200'}`}
                  >
                    <Text className={`text-xs font-bold ${on ? 'text-card' : 'text-neutral-700'}`}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {first ? (
            <Pressable onPress={() => open(first)} className="px-4 pt-1.5 pb-4 active:opacity-80">
              <VideoThumb v={first} play="corner" />
              <Text className="text-[14.5px] font-extrabold text-neutral-900 mt-2.5 leading-[19px]" numberOfLines={3}>
                {first.judul}
              </Text>
              <Text className="text-[11px] text-neutral-500 mt-1" numberOfLines={1}>
                {videoMeta([id === 'all' ? first.kategori?.nama : first.channelNama, fmtVideoDate(first.tayangAt, i18n.language)])}
              </Text>
            </Pressable>
          ) : null}
          <View className="px-4 gap-3.5">
            {rest.slice(0, limit).map((v) => (
              <VideoRow
                key={v.id}
                v={v}
                onPress={() => open(v)}
                meta={id === 'all' ? videoMeta([v.kategori?.nama, fmtVideoDate(v.tayangAt, i18n.language)]) : undefined}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
