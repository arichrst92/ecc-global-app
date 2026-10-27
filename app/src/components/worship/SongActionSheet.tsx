/** Menu lagu (ketuk lama / ikon titik tiga). */
import { Modal, Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Download, Heart, ListPlus, MicVocal, Music, Play, Share2, Trash2 } from 'lucide-react-native';

import { shareUrlOf, type WorshipTrack } from '@/api/worship';
import { useToggleFavorite, useWorshipLibrary } from '@/hooks/useWorship';
import { dlKey, downloadsSupported, useWorshipDownloads } from '@/lib/worshipDownloads';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { useToast } from '@/components/ui/Toast';
import { Cover } from './Cover';
import { nc } from '@/theme/ThemeRoot';
import { openShareCard } from '@/features/share/shareStore';

export function SongActionSheet({ track, onClose }: { track: WorshipTrack | null; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const lib = useWorshipLibrary();
  const fav = useToggleFavorite();
  const playTracks = useWorshipPlayer((s) => s.playTracks);
  const addToQueue = useWorshipPlayer((s) => s.addToQueue);
  const entries = useWorshipDownloads((s) => s.entries);
  const download = useWorshipDownloads((s) => s.download);
  const remove = useWorshipDownloads((s) => s.remove);
  if (!track) return null;
  const liked = lib.data?.favorites.includes(track.id) ?? false;
  const hasV = !!entries[dlKey(track.id, 'VOKAL')];
  const hasK = !!entries[dlKey(track.id, 'KARAOKE')];

  const run = (fn: () => unknown) => () => {
    onClose();
    void fn();
  };
  const dl = (modes: ('VOKAL' | 'KARAOKE')[]) =>
    run(async () => {
      showToast(t('worship.downloading'), 'info');
      try {
        for (const m of modes) await download(track, m);
        showToast(t('worship.downloaded'), 'success');
      } catch {
        showToast(t('worship.download_failed'), 'error');
      }
    });

  const Row = ({ icon, label, onPress, danger }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5 active:opacity-60">
      {icon}
      <Text className={`text-[15px] ${danger ? 'text-red-600' : 'text-neutral-900'}`}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-5 pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="flex-row items-center gap-3 pb-3 border-b border-neutral-100">
          <Cover url={track.coverUrl} size={44} />
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-neutral-900" numberOfLines={1}>
              {track.judul}
            </Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {track.albumTipe === 'SINGLE' ? 'Single' : track.albumJudul}
            </Text>
          </View>
        </View>
        <Row icon={<Play size={20} color={nc('#404040')} />} label={t('worship.play_only_this')} onPress={run(() => playTracks([track], 0, { source: track.judul }))} />
        <Row icon={<ListPlus size={20} color={nc('#404040')} />} label={t('worship.add_to_queue')} onPress={run(() => { addToQueue([track]); showToast(t('worship.added_to_queue'), 'success'); })} />
        <Row
          icon={<Heart size={20} color={liked ? '#EA580C' : nc('#404040')} fill={liked ? '#EA580C' : 'transparent'} />}
          label={liked ? t('worship.unlike') : t('worship.like')}
          onPress={run(() => fav.mutate({ songId: track.id, like: !liked }))}
        />
        {downloadsSupported ? (
          hasV || hasK ? (
            <Row icon={<Trash2 size={20} color="#DC2626" />} label={t('worship.remove_download')} danger onPress={run(() => remove(track.id))} />
          ) : (
            <>
              <Row icon={<Download size={20} color={nc('#404040')} />} label={t('worship.download_vokal')} onPress={dl(['VOKAL'])} />
              {track.hasKaraoke ? (
                <>
                  <Row icon={<Music size={20} color={nc('#404040')} />} label={t('worship.download_karaoke')} onPress={dl(['KARAOKE'])} />
                  <Row icon={<MicVocal size={20} color={nc('#404040')} />} label={t('worship.download_both')} onPress={dl(['VOKAL', 'KARAOKE'])} />
                </>
              ) : null}
            </>
          )
        ) : null}
        <Row
          icon={<Share2 size={20} color={nc('#404040')} />}
          label={t('worship.share')}
          onPress={run(() =>
            openShareCard(
              {
                kind: 'song',
                title: track.judul,
                subtitle: track.albumTipe === 'SINGLE' ? 'ECC Worship · Single' : `ECC Worship · ${track.albumJudul}`,
                coverUrl: track.coverUrl,
                caption: `${track.judul} — ECC Worship\n${shareUrlOf(track.id)}`,
              },
              450,
            ),
          )}
        />
      </View>
    </Modal>
  );
}
