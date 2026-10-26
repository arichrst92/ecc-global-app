/**
 * Lirik lagu — tersinkron (baris aktif menyala, auto-scroll, ketuk = lompat)
 * atau statis bila belum disinkron. `big` = tampilan karaoke.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { WorshipTrack } from '@/api/worship';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { nc } from '@/theme/ThemeRoot';

export function LyricsView({ track, big = false, dark = false, fontScale = 1 }: { track: WorshipTrack; big?: boolean; dark?: boolean; fontScale?: number }) {
  const { t } = useTranslation();
  const currentTime = useWorshipPlayer((s) => s.currentTime);
  const seek = useWorshipPlayer((s) => s.seek);
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<number[]>([]);
  const viewH = useRef(0);

  const synced = useMemo(() => (Array.isArray(track.lirikSinkron) && track.lirikSinkron.length ? track.lirikSinkron : null), [track]);
  const lines = useMemo(
    () =>
      synced
        ? synced.map((l) => ({ line: l.line, t: l.t as number | null }))
        : (track.lirik ?? '')
            .split(/\r?\n/)
            .map((l) => ({ line: l.trim(), t: null as number | null })),
    [synced, track.lirik],
  );

  const active = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i]!.t !== null && lines[i]!.t! <= currentTime + 0.15) idx = i;
    return idx;
  }, [synced, lines, currentTime]);

  useEffect(() => {
    if (active < 0) return;
    const y = ys.current[active];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - viewH.current * 0.35), animated: true });
  }, [active]);

  if (!lines.some((l) => l.line)) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className={dark ? 'text-white/60' : 'text-neutral-400'}>{t('worship.no_lyrics')}</Text>
      </View>
    );
  }

  const base = (big ? 22 : 17) * fontScale;
  return (
    <ScrollView
      ref={scroll}
      className="flex-1"
      onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
      contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 8 }}
      showsVerticalScrollIndicator={false}
    >
      {lines.map((l, i) => {
        const isActive = i === active;
        const muted = synced && !isActive;
        if (!l.line) return <View key={i} style={{ height: base * 0.8 }} />;
        return (
          <Pressable
            key={i}
            disabled={l.t === null}
            onPress={() => l.t !== null && seek(l.t)}
            onLayout={(e) => (ys.current[i] = e.nativeEvent.layout.y)}
          >
            <Text
              style={{
                fontSize: isActive ? base * 1.12 : base,
                lineHeight: base * 1.6,
                fontWeight: isActive ? '700' : big ? '600' : '500',
                textAlign: big ? 'center' : 'left',
                color: dark ? (isActive ? '#FDBA74' : muted ? 'rgba(255,255,255,0.45)' : '#FFFFFF') : isActive ? '#EA580C' : muted ? nc('#A3A3A3') : nc('#262626'),
              }}
            >
              {l.line}
            </Text>
          </Pressable>
        );
      })}
      {!synced ? (
        <Text className={`text-[11px] mt-4 ${dark ? 'text-white/40' : 'text-neutral-400'}`} style={{ textAlign: big ? 'center' : 'left' }}>
          {t('worship.lyrics_static')}
        </Text>
      ) : null}
    </ScrollView>
  );
}
