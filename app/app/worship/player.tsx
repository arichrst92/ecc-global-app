/**
 * ECC Worship — pemutar layar penuh.
 * Vokal: cover + kontrol (+ lirik). Karaoke: layar gelap, lirik besar,
 * ukuran teks bisa diatur, layar tetap menyala.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import {
  ALargeSmall,
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';

import { fmtDur, shareUrlOf } from '@/api/worship';
import { useToggleFavorite, useWorshipLibrary } from '@/hooks/useWorship';
import { useCurrentTrack, useWorshipPlayer } from '@/stores/worship-player.store';
import { Cover } from '@/components/worship/Cover';
import { LyricsView } from '@/components/worship/LyricsView';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';

const KEEP_AWAKE_TAG = 'ecc-worship-karaoke';

export default function WorshipPlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const track = useCurrentTrack();
  const s = useWorshipPlayer();
  const lib = useWorshipLibrary();
  const fav = useToggleFavorite();
  const [showLyrics, setShowLyrics] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [barW, setBarW] = useState(1);
  const karaoke = s.mode === 'KARAOKE';

  useEffect(() => {
    if (!karaoke) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [karaoke]);

  useEffect(() => {
    if (!track) goBack(router);
  }, [track, router]);
  if (!track) return null;

  const liked = lib.data?.favorites.includes(track.id) ?? false;
  const dur = s.duration || track.durasi || 0;
  const pct = dur ? Math.min(1, s.currentTime / dur) : 0;
  const fg = karaoke ? '#FFFFFF' : '#171717';
  const sub = karaoke ? 'rgba(255,255,255,0.7)' : '#737373';
  const cover = Math.min(width - 64, 320);

  return (
    <View className="flex-1" style={{ backgroundColor: karaoke ? '#1C1410' : '#FFFFFF' }}>
      <StatusBar style={karaoke ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']}>
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ChevronDown size={24} color={fg} />
          </Pressable>
          <Text className="flex-1 text-center text-xs" style={{ color: sub }} numberOfLines={1}>
            {t('worship.playing_from', { source: s.sourceLabel })}
            {s.shuffle ? ` · ${t('worship.shuffle')}` : ''}
          </Text>
          {karaoke ? (
            <Pressable onPress={() => setFontScale((f) => (f >= 1.4 ? 0.85 : Math.round((f + 0.15) * 100) / 100))} className="w-10 h-10 items-center justify-center">
              <ALargeSmall size={22} color={fg} />
            </Pressable>
          ) : (
            <Pressable onPress={() => Share.share({ message: `${track.judul} — ECC Worship\n${shareUrlOf(track.id)}` })} className="w-10 h-10 items-center justify-center">
              <Share2 size={20} color={fg} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Toggle Vokal / Karaoke */}
      {track.hasKaraoke ? (
        <View className="mx-6 flex-row rounded-full overflow-hidden border" style={{ borderColor: karaoke ? 'rgba(255,255,255,0.3)' : '#E5E5E5' }}>
          {(['VOKAL', 'KARAOKE'] as const).map((m) => (
            <Pressable key={m} onPress={() => void s.setMode(m)} {...gx(`flex-1 py-2 items-center ${s.mode === m ? 'bg-brand-500' : ''}`)}>
              <Text className="text-xs font-semibold" style={{ color: s.mode === m ? '#fff' : sub }}>
                {m === 'VOKAL' ? t('worship.vokal') : 'Karaoke'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-1 px-6 pt-4">
        {karaoke || showLyrics ? (
          <LyricsView track={track} big={karaoke} dark={karaoke} fontScale={fontScale} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Cover url={track.coverUrl} size={cover} radius={18} />
          </View>
        )}
      </View>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center gap-3 mt-3">
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-bold" style={{ color: fg }} numberOfLines={1}>
              {track.judul}
            </Text>
            <Text className="text-xs" style={{ color: sub }} numberOfLines={1}>
              {[track.albumTipe === 'SINGLE' ? 'Single' : track.albumJudul, track.ciptaan ? `Cipt. ${track.ciptaan}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable onPress={() => fav.mutate({ songId: track.id, like: !liked })} hitSlop={10}>
            <Heart size={22} color={liked ? '#F97316' : fg} fill={liked ? '#F97316' : 'transparent'} />
          </Pressable>
        </View>

        {/* Progress (ketuk untuk seek) */}
        <Pressable
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          onPress={(e) => dur && s.seek((e.nativeEvent.locationX / barW) * dur)}
          className="mt-4 py-2"
        >
          <View className="h-1 rounded-full" style={{ backgroundColor: karaoke ? 'rgba(255,255,255,0.25)' : '#E5E5E5' }}>
            <View {...gx('h-1 rounded-full bg-brand-500', { width: `${pct * 100}%` })}  />
          </View>
        </Pressable>
        <View className="flex-row justify-between">
          <Text className="text-[11px]" style={{ color: sub }}>
            {fmtDur(s.currentTime)}
          </Text>
          <Text className="text-[11px]" style={{ color: sub }}>
            {fmtDur(dur)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <Pressable onPress={s.toggleShuffle} hitSlop={10}>
            <Shuffle size={20} color={s.shuffle ? '#F97316' : sub} />
          </Pressable>
          <Pressable onPress={() => void s.prev()} hitSlop={10}>
            <SkipBack size={28} color={fg} fill={fg} />
          </Pressable>
          <Pressable onPress={s.toggle} {...gx('w-16 h-16 rounded-full bg-brand-500 items-center justify-center')}>
            {s.loading ? <ActivityIndicator color="#fff" /> : s.playing ? <Pause size={28} color="#fff" fill="#fff" /> : <Play size={28} color="#fff" fill="#fff" />}
          </Pressable>
          <Pressable onPress={() => void s.next()} hitSlop={10}>
            <SkipForward size={28} color={fg} fill={fg} />
          </Pressable>
          <Pressable onPress={s.cycleRepeat} hitSlop={10}>
            {s.repeat === 'one' ? <Repeat1 size={20} color="#F97316" /> : <Repeat size={20} color={s.repeat === 'all' ? '#F97316' : sub} />}
          </Pressable>
        </View>
        {s.error ? <Text className="text-xs text-red-500 text-center mt-2">{s.error}</Text> : null}

        <View className="flex-row justify-center gap-3 mt-4">
          {!karaoke ? (
            <Pressable onPress={() => setShowLyrics((v) => !v)} className="px-4 py-2 rounded-full border border-neutral-300">
              <Text className="text-xs font-semibold text-neutral-800">{showLyrics ? t('worship.cover') : t('worship.lyrics')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setQueueOpen(true)}
            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border"
            style={{ borderColor: karaoke ? 'rgba(255,255,255,0.3)' : '#D4D4D4' }}
          >
            <ListMusic size={14} color={fg} />
            <Text className="text-xs font-semibold" style={{ color: fg }}>
              {t('worship.queue')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={queueOpen} transparent animationType="slide" onRequestClose={() => setQueueOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setQueueOpen(false)} />
        <View className="bg-white rounded-t-3xl px-5 pt-4" style={{ maxHeight: '70%', paddingBottom: insets.bottom + 12 }}>
          <Text className="text-base font-bold text-neutral-900 mb-2">{t('worship.queue')}</Text>
          <ScrollView>
            {s.order.map((qi, i) => {
              const x = s.queue[qi];
              if (!x) return null;
              const cur = i === s.pos;
              return (
                <Pressable
                  key={`${qi}-${i}`}
                  onPress={() => {
                    void s.jumpTo(i);
                    setQueueOpen(false);
                  }}
                  className="flex-row items-center gap-3 py-2"
                >
                  <Cover url={x.coverUrl} size={36} radius={6} />
                  <View className="flex-1 min-w-0">
                    <Text className={`text-sm ${cur ? 'text-brand-600 font-semibold' : 'text-neutral-900'}`} numberOfLines={1}>
                      {x.judul}
                    </Text>
                    <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                      {x.albumTipe === 'SINGLE' ? 'Single' : x.albumJudul}
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400">{fmtDur(x.durasi)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
