/**
 * Mini-player ECC Worship — melayang di bawah layar selama ada lagu aktif.
 * Tampil di tab (di atas tab bar) dan layar ECC Worship; disembunyikan di
 * Beranda (diganti kartu "Sedang diputar"), pemutar penuh, dan layar lain
 * supaya tidak menutup tombol.
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, SkipForward } from 'lucide-react-native';

import { useCurrentTrack, useWorshipPlayer } from '@/stores/worship-player.store';
import { Cover } from './Cover';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

const TAB_SCREENS = new Set(['ibadah', 'event', 'ckids', 'persembahan', 'profile']);

export function MiniPlayer() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const track = useCurrentTrack();
  const playing = useWorshipPlayer((s) => s.playing);
  const loading = useWorshipPlayer((s) => s.loading);
  const currentTime = useWorshipPlayer((s) => s.currentTime);
  const duration = useWorshipPlayer((s) => s.duration);
  const mode = useWorshipPlayer((s) => s.mode);
  const toggle = useWorshipPlayer((s) => s.toggle);
  const next = useWorshipPlayer((s) => s.next);

  if (!track) return null;
  const inTabs = segments[0] === '(tabs)';
  const tab = inTabs ? (segments[1] ?? 'index') : null;
  const inWorship = segments[0] === 'worship' && segments[1] !== 'player';
  if (!(inTabs && tab && TAB_SCREENS.has(tab)) && !inWorship) return null;
  const bottom = inTabs ? 64 + insets.bottom + 6 : insets.bottom + 8;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 10, right: 10, bottom }}>
      <Pressable
        onPress={() => router.push('/worship/player' as never)}
        className="bg-card rounded-2xl border border-neutral-200 overflow-hidden"
        style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
      >
        <View className="flex-row items-center gap-3 px-3 py-2">
          <Cover url={track.coverUrl} size={38} radius={8} />
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
              {track.judul}
            </Text>
            <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
              {mode === 'KARAOKE' ? 'Karaoke · ' : ''}
              {track.albumTipe === 'SINGLE' ? 'Single' : track.albumJudul}
            </Text>
          </View>
          <Pressable onPress={toggle} hitSlop={8} {...gx('w-9 h-9 rounded-full bg-brand-500 items-center justify-center')}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : playing ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
          </Pressable>
          <Pressable onPress={() => void next()} hitSlop={8} className="w-8 h-9 items-center justify-center">
            <SkipForward size={20} color={nc('#404040')} />
          </Pressable>
        </View>
        <View className="h-[3px] bg-neutral-100">
          <View {...gx('h-[3px] bg-brand-500', { width: `${pct}%` })}  />
        </View>
      </Pressable>
    </View>
  );
}
