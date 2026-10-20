/** Kartu "Sedang diputar" di Beranda — hanya tampil bila ada lagu aktif. */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Music, Pause, Play, SkipForward, X } from 'lucide-react-native';

import { useCurrentTrack, useWorshipPlayer } from '@/stores/worship-player.store';
import { Cover } from './Cover';

export function NowPlayingCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const track = useCurrentTrack();
  const playing = useWorshipPlayer((s) => s.playing);
  const loading = useWorshipPlayer((s) => s.loading);
  const currentTime = useWorshipPlayer((s) => s.currentTime);
  const duration = useWorshipPlayer((s) => s.duration);
  const mode = useWorshipPlayer((s) => s.mode);
  const toggle = useWorshipPlayer((s) => s.toggle);
  const next = useWorshipPlayer((s) => s.next);
  const close = useWorshipPlayer((s) => s.close);
  if (!track) return null;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <View className="px-5 mt-4">
      <Pressable onPress={() => router.push('/worship/player' as never)} className="bg-white rounded-2xl border border-neutral-100 p-3 gap-2">
        <View className="flex-row items-center gap-1.5">
          <Music size={12} color="#C2410C" />
          <Text className="text-[10px] font-bold text-brand-700 flex-1">{t('worship.now_playing')}</Text>
          <Pressable onPress={close} hitSlop={10}>
            <X size={16} color="#A3A3A3" />
          </Pressable>
        </View>
        <View className="flex-row items-center gap-3">
          <Cover url={track.coverUrl} size={48} />
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-neutral-900" numberOfLines={1}>
              {track.judul}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-neutral-500 shrink" numberOfLines={1}>
                {track.albumTipe === 'SINGLE' ? 'Single' : track.albumJudul}
              </Text>
              {mode === 'KARAOKE' ? (
                <View className="bg-brand-100 rounded-full px-1.5">
                  <Text className="text-[10px] font-semibold text-brand-800">Karaoke</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Pressable onPress={toggle} hitSlop={8} className="w-10 h-10 rounded-full bg-brand-500 items-center justify-center">
            {loading ? <ActivityIndicator size="small" color="#fff" /> : playing ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
          </Pressable>
          <Pressable onPress={() => void next()} hitSlop={8}>
            <SkipForward size={20} color="#404040" />
          </Pressable>
        </View>
        <View className="h-[3px] bg-neutral-100 rounded-full overflow-hidden">
          <View className="h-[3px] bg-brand-500" style={{ width: `${pct}%` }} />
        </View>
      </Pressable>
    </View>
  );
}
