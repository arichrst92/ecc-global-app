/**
 * Komponen bersama Detail Ibadah & Detail Event (relayout 2.5.1):
 * tab, isi yang dilipat (Selengkapnya), carousel tiket (geser ke samping),
 * baris yang bisa dibuka-tutup, dan video teaser (diputar di dalam app).
 * Informasi & alur sama seperti sebelumnya — hanya tata letak yang diringkas.
 */
import { useState, type ReactNode } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, ExternalLink, Play } from 'lucide-react-native';

import { YoutubePlayer } from '@/components/video/YoutubePlayer';
import { PlayerBoundary } from '@/components/video/PlayerBoundary';
import { useSwipeLocked } from '@/components/tiket/swipeLock';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { isDark, nc } from '@/theme/ThemeRoot';

export const gradientStyle = (g: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: g } : { experimental_backgroundImage: g }) as ViewStyle;

/**
 * Bilah atas + hero detail ibadah menyambung tanpa sambungan: bilah = warna
 * awal gradasi, hero = gradasi vertikal dari warna yang sama.
 */
export const heroTop = () => (isDark() ? '#EA580C' : '#F97316');
export const heroGradient = () =>
  gradientStyle(isDark() ? 'linear-gradient(180deg, #EA580C 0%, #9A3412 100%)' : 'linear-gradient(180deg, #F97316 0%, #C2410C 100%)');

// ------------------------------------------------------------------ tab

export type DetailTab = { key: string; label: string; badge?: number };

export function DetailTabs({ tabs, value, onChange }: { tabs: DetailTab[]; value: string; onChange: (k: string) => void }) {
  return (
    <View className="flex-row bg-neutral-100 rounded-xl p-1">
      {tabs.map((x) => {
        const on = x.key === value;
        return (
          <Pressable
            key={x.key}
            onPress={() => onChange(x.key)}
            className={`flex-1 flex-row items-center justify-center gap-1 py-2 rounded-[9px] ${on ? 'bg-card' : ''}`}
            style={on ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text className={`text-[12.5px] font-bold flex-shrink ${on ? 'text-neutral-900' : 'text-neutral-500'}`} numberOfLines={1}>
              {x.label}
            </Text>
            {x.badge ? (
              <View className="bg-brand-500 rounded-full px-1.5 min-w-[18px] items-center">
                <Text className="text-[10px] font-bold text-white">{x.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ kosong

/** Isi tab kosong (deskripsi / tim pelayanan belum ada) — logo Els App + keterangan. */
export function EmptyPane({ text }: { text: string }) {
  return (
    <View className="bg-card rounded-2xl border border-neutral-100 items-center py-8 px-6">
      <ElsEmptyIcon size={44} />
      <Text className="text-sm text-neutral-500 text-center mt-2">{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ isi dilipat

/**
 * Isi panjang dilipat (±6 baris) dengan pudar di bawah → "Selengkapnya" membuka
 * di tempat, "Sembunyikan" melipat lagi. Isi pendek tampil utuh tanpa tombol.
 */
export function Collapsible({ children, maxHeight = 132 }: { children: ReactNode; maxHeight?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(0);
  const long = h > maxHeight + 24;
  const fade = isDark() ? 'rgba(28,28,30,' : 'rgba(255,255,255,';
  return (
    <View>
      <View style={{ maxHeight: long && !open ? maxHeight : undefined, overflow: 'hidden' }}>
        <View onLayout={(e) => setH(e.nativeEvent.layout.height)}>{children}</View>
        {long && !open ? (
          <View
            pointerEvents="none"
            style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 }, gradientStyle(`linear-gradient(180deg, ${fade}0) 0%, ${fade}1) 100%)`)]}
          />
        ) : null}
      </View>
      {long ? (
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8} className="self-start mt-1.5">
          <Text className="text-xs font-bold text-brand-600">{open ? t('detail.show_less') : t('detail.show_more')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ judul bagian

export function SectionHead({ title, right }: { title: string; right?: string | null }) {
  return (
    <View className="flex-row items-end justify-between mb-2">
      <Text className="text-[15px] font-bold text-neutral-900 flex-1" numberOfLines={1}>
        {title}
      </Text>
      {right ? <Text className="text-[11px] font-semibold text-neutral-500">{right}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ carousel tiket

/**
 * Tiket keluarga digeser ke samping (kartu berikutnya mengintip di kanan).
 * Satu tiket → lebar penuh tanpa carousel.
 * Geser check-in di dalam tiket: slider mengunci scroll induk (swipeLock) —
 * carousel ini ikut terkunci, jadi slider tetap bisa digeser di Android.
 * `padX` = padding horizontal halaman (kartu tetap rata kiri dengan isi lain).
 */
export function TicketCarousel<T>({
  title,
  items,
  keyOf,
  render,
  padX = 20,
}: {
  title: string;
  items: T[];
  keyOf: (x: T) => string;
  render: (x: T) => ReactNode;
  padX?: number;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const locked = useSwipeLocked();
  const [idx, setIdx] = useState(0);
  if (!items.length) return null;
  const single = items.length === 1;
  const cardW = Math.min(width - padX * 2 - (single ? 0 : 28), 520);
  const gap = 10;
  return (
    <View>
      <View style={{ paddingHorizontal: padX }}>
        <SectionHead title={title} right={single ? null : t('detail.swipe_count', { n: idx + 1, total: items.length })} />
      </View>
      {single ? (
        <View style={{ paddingHorizontal: padX }}>{render(items[0]!)}</View>
      ) : (
        <>
          <ScrollView
            horizontal
            nestedScrollEnabled
            scrollEnabled={!locked}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardW + gap}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: padX, gap }}
            scrollEventThrottle={32}
            onScroll={(e) => setIdx(Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardW + gap)))))}
          >
            {items.map((x) => (
              <View key={keyOf(x)} style={{ width: cardW }}>
                {render(x)}
              </View>
            ))}
          </ScrollView>
          <View className="flex-row justify-center gap-[5px] mt-2.5">
            {items.map((x, i) => (
              <View key={keyOf(x)} className={`h-1.5 rounded-full ${i === idx ? 'w-4 bg-brand-500' : 'w-1.5 bg-neutral-300'}`} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ baris buka-tutup

export function ExpandRow({
  icon,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  first = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string | null;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  first?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View className={first ? '' : 'border-t border-neutral-100'}>
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3 px-3.5 py-3 active:opacity-70" accessibilityState={{ expanded: open }}>
        <View className="w-8 h-8 rounded-[10px] bg-brand-50 items-center justify-center">{icon}</View>
        <View className="flex-1 min-w-0">
          <Text className="text-[13px] font-bold text-neutral-900" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge}
        {open ? <ChevronUp size={16} color={nc('#A3A3A3')} /> : <ChevronDown size={16} color={nc('#A3A3A3')} />}
      </Pressable>
      {open ? <View className="px-3.5 pb-3.5">{children}</View> : null}
    </View>
  );
}

// ------------------------------------------------------------------ video teaser

/** ID video YouTube dari link biasa / youtu.be / embed / shorts / live. */
export function youtubeIdOf(url: string): string | null {
  const s = url.trim();
  const m =
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(s);
  return m ? m[1]! : null;
}

/**
 * Kartu pratinjau 16:9. Link YouTube → diputar di dalam app (pemutar yang sama
 * dengan Video Channel); link lain → dibuka di luar seperti sebelumnya.
 */
export function VideoTeaser({ url }: { url: string }) {
  const { t } = useTranslation();
  const yt = youtubeIdOf(url);
  const [playing, setPlaying] = useState(false);
  if (yt && playing) {
    return (
      <View style={{ borderRadius: 14, overflow: 'hidden' }}>
        <PlayerBoundary youtubeId={yt} label={t('media.open_youtube')}>
          <YoutubePlayer youtubeId={yt} />
        </PlayerBoundary>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => (yt ? setPlaying(true) : void Linking.openURL(url).catch(() => {}))}
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1c0606' }}
      className="active:opacity-90"
      accessibilityRole="button"
      accessibilityLabel={t('event.watch_teaser')}
    >
      {yt ? (
        <Image source={{ uri: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={18} color="#171717" fill="#171717" style={{ marginLeft: 2 }} />
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('event.teaser_label')}</Text>
        {!yt ? <ExternalLink size={14} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}
