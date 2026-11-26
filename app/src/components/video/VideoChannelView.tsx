/**
 * Tab Video Channel di layar Media (2.5.1, relayout): hero video unggulan
 * (geser), chip kategori, rak "Terbaru" + satu rak per kategori ("Lihat semua"
 * → /media/kategori/:id). Cari = /media/search (ikon di header Media).
 * Ketuk video → /media/video/:id.
 */
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Play } from 'lucide-react-native';

import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { useVideoCatalog } from '@/hooks/useVideos';
import type { VideoItem } from '@/api/videos';
import { ApiError } from '@/types/api';
import { useCappedHeight, useKeepPage } from '@/hooks/useFoldSafe';

export const fmtVideoDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/** Video tayang ≤ 7 hari lalu → badge BARU. */
export const isNewVideo = (v: VideoItem) => Date.now() - new Date(v.tayangAt).getTime() < 7 * 86_400_000;

/** Gradient bebas (RN New Architecture: experimental_backgroundImage; web: CSS). */
export const bgGradient = (g: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: g } : { experimental_backgroundImage: g }) as ViewStyle;

export const videoMeta = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

export function VideoThumb({
  v,
  radius = 14,
  play = 'none',
  showNew = true,
}: {
  v: VideoItem;
  radius?: number;
  /** Tombol putar: tengah / pojok kanan bawah / tanpa. */
  play?: 'center' | 'corner' | 'none';
  showNew?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius, overflow: 'hidden' }} className="bg-neutral-200">
      <Image source={{ uri: v.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      {showNew && isNewVideo(v) ? (
        <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.2 }}>{t('media.new_badge')}</Text>
        </View>
      ) : null}
      {play !== 'none' ? (
        <View
          pointerEvents="none"
          style={
            play === 'center'
              ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }
              : { position: 'absolute', right: 10, bottom: 10 }
          }
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={14} color="#171717" fill="#171717" style={{ marginLeft: 2 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Kartu rak horizontal (lebar 200). */
export function VideoCard({ v, onPress, width = 200 }: { v: VideoItem; onPress: () => void; width?: number }) {
  const { i18n } = useTranslation();
  return (
    <Pressable onPress={onPress} style={{ width }} className="active:opacity-80">
      <VideoThumb v={v} />
      <Text className="text-[12.5px] font-bold text-neutral-900 mt-2 leading-[17px]" numberOfLines={2}>
        {v.judul}
      </Text>
      <Text className="text-[10.5px] text-neutral-500 mt-0.5" numberOfLines={1}>
        {videoMeta([v.kategori?.nama, fmtVideoDate(v.tayangAt, i18n.language)])}
      </Text>
    </Pressable>
  );
}

/** Judul dengan kata pencarian disorot. */
function Highlighted({ text, q }: { text: string; q?: string }) {
  const s = (q ?? '').trim();
  if (!s) return <>{text}</>;
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'ig'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === s.toLowerCase() ? (
          <Text key={i} className="bg-brand-100 text-brand-800">
            {p}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </>
  );
}

/** Baris ringkas: thumbnail 136 + judul 2 baris + meta. */
export function VideoRow({
  v,
  onPress,
  meta,
  kategoriPill = false,
  highlight,
}: {
  v: VideoItem;
  onPress: () => void;
  /** Teks meta; bawaan "channel · tanggal". */
  meta?: string;
  kategoriPill?: boolean;
  highlight?: string;
}) {
  const { i18n } = useTranslation();
  return (
    <Pressable onPress={onPress} className="flex-row gap-3 active:opacity-80">
      <View style={{ width: 136 }}>
        <VideoThumb v={v} radius={12} showNew={false} />
      </View>
      <View className="flex-1 min-w-0">
        {kategoriPill && v.kategori ? (
          <View className="self-start bg-brand-50 border border-brand-100 rounded-md px-1.5 py-0.5 mb-1">
            <Text className="text-[9.5px] font-extrabold text-brand-700 uppercase tracking-wide">{v.kategori.nama}</Text>
          </View>
        ) : null}
        <Text className="text-[13px] font-bold text-neutral-900 leading-[18px]" numberOfLines={2}>
          <Highlighted text={v.judul} q={highlight} />
        </Text>
        <Text className="text-[10.5px] text-neutral-500 mt-1" numberOfLines={1}>
          {meta ?? videoMeta([v.channelNama, fmtVideoDate(v.tayangAt, i18n.language)])}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionHead({ title, onAll }: { title: string; onAll?: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-end justify-between px-4 pt-[18px] pb-2.5">
      <Text className="text-[15.5px] font-bold text-neutral-900">{title}</Text>
      {onAll ? (
        <Pressable onPress={onAll} hitSlop={8} className="flex-row items-center">
          <Text className="text-xs font-bold text-brand-600">{t('media.see_all')}</Text>
          <ChevronRight size={14} color="#EA580C" />
        </Pressable>
      ) : null}
    </View>
  );
}

const RAIL = 10;

export function VideoChannelView() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const q = useVideoCatalog();
  const d = q.data;
  const [heroIdx, setHeroIdx] = useState(0);
  const open = (v: VideoItem) => router.push(`/media/video/${v.id}` as never);
  const openKat = (id: string) => router.push(`/media/kategori/${id}` as never);

  const heroW = Math.min(width - 32, 520);
  // Layar dalam HP lipat (terutama mendatar): kartu unggulan tidak melebihi layar.
  const heroH = useCappedHeight(heroW, 1 / 1.075, 0.62);
  const heroRef = useRef<ScrollView>(null);
  useKeepPage(heroRef, heroW + 12, heroIdx);
  const hero = useMemo(() => {
    const f = d?.featured ?? [];
    return f.length ? f : (d?.videos ?? []).slice(0, 3);
  }, [d]);
  const rails = useMemo(() => {
    const all = d?.videos ?? [];
    return (d?.kategori ?? [])
      .map((k) => ({ k, items: all.filter((v) => v.kategori?.id === k.id) }))
      .filter((r) => r.items.length > 0);
  }, [d]);

  if (q.isPending) return <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />;
  if (q.isError)
    return <Text className="text-sm text-red-600 text-center p-8">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>;
  if (!d?.videos.length) return <Text className="text-sm text-neutral-400 text-center mt-10">{t('media.empty')}</Text>;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
      refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
    >
      {/* Hero unggulan */}
      {hero.length ? (
        <View>
          <ScrollView
            ref={heroRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={heroW + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            scrollEventThrottle={32}
            onScroll={(e) => setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / (heroW + 12)))}
          >
            {hero.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => open(v)}
                style={{
                  width: heroW,
                  height: heroH,
                  borderRadius: 22,
                  overflow: 'hidden',
                  backgroundColor: '#1c0f08',
                  shadowColor: '#9A3412',
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}
                className="active:opacity-90"
              >
                <Image source={{ uri: v.thumbnailUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                <View
                  pointerEvents="none"
                  style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, bgGradient('linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)')]}
                />
                <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                  <Text style={{ color: '#FDBA74', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }} numberOfLines={1}>
                    {videoMeta([d.featured.length ? t('media.featured_kicker') : t('media.latest'), v.kategori?.nama]).toUpperCase()}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 24, marginTop: 6 }} numberOfLines={3}>
                    {v.judul}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 6 }} numberOfLines={1}>
                    {videoMeta([v.channelNama, fmtVideoDate(v.tayangAt, i18n.language)])}
                  </Text>
                  <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12 }}>
                    <Play size={14} color="#171717" fill="#171717" />
                    <Text style={{ color: '#171717', fontSize: 13, fontWeight: '800' }}>{t('media.watch_now')}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {hero.length > 1 ? (
            <View className="flex-row justify-center gap-[5px] mt-2.5">
              {hero.map((v, i) => (
                <View key={v.id} className={`h-1.5 rounded-full ${i === heroIdx ? 'w-[18px] bg-brand-500' : 'w-1.5 bg-neutral-300'}`} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Chip kategori → halaman kategori */}
      {d.kategori.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 }}>
          <View className="px-[13px] py-[7px] rounded-full bg-neutral-900 border border-neutral-900">
            <Text className="text-xs font-bold text-card">{t('media.all')}</Text>
          </View>
          {d.kategori.map((k) => (
            <Pressable key={k.id} onPress={() => openKat(k.id)} className="px-[13px] py-[7px] rounded-full bg-card border border-neutral-200 active:opacity-70">
              <Text className="text-xs font-bold text-neutral-700">{k.nama}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Terbaru */}
      <SectionHead title={t('media.latest')} onAll={() => openKat('all')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {d.videos.slice(0, RAIL).map((v) => (
          <VideoCard key={v.id} v={v} onPress={() => open(v)} />
        ))}
      </ScrollView>

      {/* Rak per kategori */}
      {rails.map(({ k, items }) => (
        <View key={k.id}>
          <SectionHead title={k.nama} onAll={() => openKat(k.id)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {items.slice(0, RAIL).map((v) => (
              <VideoCard key={v.id} v={v} onPress={() => open(v)} />
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}
