/** Baris lagu ECC Worship. */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CircleCheck, EllipsisVertical, Square, SquareCheck } from 'lucide-react-native';

import { fmtDur, type WorshipTrack } from '@/api/worship';
import { dlKey, useWorshipDownloads } from '@/lib/worshipDownloads';
import { useCurrentTrack, useWorshipPlayer } from '@/stores/worship-player.store';
import { Cover } from './Cover';
import { nc } from '@/theme/ThemeRoot';

export function SongRow({
  track,
  index,
  showCover = true,
  onPress,
  onMenu,
  selecting,
  selected,
}: {
  track: WorshipTrack;
  index?: number;
  showCover?: boolean;
  onPress: () => void;
  onMenu: () => void;
  selecting?: boolean;
  selected?: boolean;
}) {
  const cur = useCurrentTrack();
  const playing = useWorshipPlayer((s) => s.playing);
  const isCur = cur?.id === track.id;
  const entries = useWorshipDownloads((s) => s.entries);
  const prog = useWorshipDownloads((s) => s.progress);
  const downloaded = !!entries[dlKey(track.id, 'VOKAL')] || !!entries[dlKey(track.id, 'KARAOKE')];
  const downloading = prog[dlKey(track.id, 'VOKAL')] !== undefined || prog[dlKey(track.id, 'KARAOKE')] !== undefined;

  return (
    <Pressable onPress={onPress} onLongPress={onMenu} className="flex-row items-center gap-3 py-2.5 active:opacity-70">
      {selecting ? selected ? <SquareCheck size={22} color="#EA580C" /> : <Square size={22} color={nc('#A3A3A3')} /> : null}
      {showCover ? (
        <Cover url={track.coverUrl} size={44} radius={8} />
      ) : index !== undefined ? (
        <Text className={`w-6 text-center text-sm ${isCur ? 'text-brand-600 font-bold' : 'text-neutral-400'}`}>{isCur && playing ? '♪' : index + 1}</Text>
      ) : null}
      <View className="flex-1 min-w-0">
        <Text className={`text-[15px] ${isCur ? 'text-brand-600 font-semibold' : 'text-neutral-900'}`} numberOfLines={1}>
          {track.judul}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {track.draft ? (
            <View className="bg-amber-100 rounded px-1">
              <Text className="text-[10px] font-bold text-amber-800">Draft</Text>
            </View>
          ) : null}
          {track.hasKaraoke ? (
            <View className="bg-brand-100 rounded-full px-1.5">
              <Text className="text-[10px] font-semibold text-brand-800">Karaoke</Text>
            </View>
          ) : null}
          <Text className="text-xs text-neutral-500 shrink" numberOfLines={1}>
            {[showCover ? (track.albumTipe === 'SINGLE' ? 'Single' : track.albumJudul) : null, track.ciptaan ? `Cipt. ${track.ciptaan}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      {downloading ? <ActivityIndicator size="small" color="#EA580C" /> : downloaded ? <CircleCheck size={16} color="#16A34A" /> : null}
      <Text className="text-xs text-neutral-400">{fmtDur(track.durasi)}</Text>
      {!selecting ? (
        <Pressable onPress={onMenu} hitSlop={10} className="pl-1">
          <EllipsisVertical size={18} color={nc('#737373')} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
