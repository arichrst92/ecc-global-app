/** ECC Worship — detail album: Putar, Acak, Karaoke semua, unduh album, bagikan, pilih beberapa lagu. */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, ListChecks, ListPlus, MicVocal, Play, Share2, Shuffle, X } from 'lucide-react-native';

import { fmtDur, shareUrlOf, tracksOf, type WorshipTrack } from '@/api/worship';
import { useWorshipLibrary } from '@/hooks/useWorship';
import { downloadsSupported, useWorshipDownloads } from '@/lib/worshipDownloads';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { useToast } from '@/components/ui/Toast';
import { Cover } from '@/components/worship/Cover';
import { SongRow } from '@/components/worship/SongRow';
import { SongActionSheet } from '@/components/worship/SongActionSheet';
import { goBack } from '@/utils/nav';

export default function WorshipAlbumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const showToast = useToast((s) => s.show);
  const q = useWorshipLibrary();
  const album = useMemo(() => [...(q.data?.albums ?? []), ...(q.data?.singles ?? [])].find((a) => a.id === id), [q.data, id]);
  const tracks = useMemo(() => (album ? tracksOf(album) : []), [album]);
  const playTracks = useWorshipPlayer((s) => s.playTracks);
  const addToQueue = useWorshipPlayer((s) => s.addToQueue);
  const download = useWorshipDownloads((s) => s.download);
  const [menu, setMenu] = useState<WorshipTrack | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());

  if (q.isPending) return <ActivityIndicator color="#F97316" style={{ marginTop: 80 }} />;
  if (!album)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <Text className="text-neutral-500">{t('worship.not_found')}</Text>
      </SafeAreaView>
    );

  const total = tracks.reduce((s, x) => s + (x.durasi ?? 0), 0);
  const karaokeTracks = tracks.filter((x) => x.hasKaraoke);
  const picked = tracks.filter((x) => sel.has(x.id));
  const coverSize = Math.min(220, width * 0.55);

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1" />
          <Pressable
            onPress={() => {
              setSelecting(!selecting);
              setSel(new Set());
            }}
            className="w-10 h-10 items-center justify-center"
          >
            {selecting ? <X size={20} color="#171717" /> : <ListChecks size={20} color="#171717" />}
          </Pressable>
          {tracks[0] ? (
            <Pressable
              onPress={() => Share.share({ message: `${album.judul} — ECC Worship\n${shareUrlOf(tracks[0]!.id)}` })}
              className="w-10 h-10 items-center justify-center"
            >
              <Share2 size={20} color="#171717" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
        <View className="items-center">
          <Cover url={album.coverUrl} size={coverSize} radius={16} />
          <Text className="text-xl font-bold text-neutral-900 mt-4 text-center">{album.judul}</Text>
          <Text className="text-xs text-neutral-500 mt-1">
            {['ECC Worship', album.tahun, t('worship.n_songs', { count: tracks.length }), fmtDur(total), album.draft ? 'Draft' : null].filter(Boolean).join(' · ')}
          </Text>
          {album.deskripsi ? <Text className="text-sm text-neutral-600 mt-2 text-center">{album.deskripsi}</Text> : null}
        </View>

        {!selecting ? (
          <View className="flex-row flex-wrap gap-2 mt-4 justify-center">
            <Pressable onPress={() => playTracks(tracks, 0, { source: album.judul, mode: 'VOKAL' })} className="flex-row items-center gap-1.5 bg-brand-500 rounded-full px-5 py-2.5">
              <Play size={16} color="#fff" fill="#fff" />
              <Text className="text-white font-semibold text-sm">{t('worship.play')}</Text>
            </Pressable>
            <Pressable
              onPress={() => playTracks(tracks, -1, { source: album.judul, shuffle: true, mode: 'VOKAL' })}
              className="flex-row items-center gap-1.5 bg-white border border-neutral-300 rounded-full px-4 py-2.5"
            >
              <Shuffle size={16} color="#171717" />
              <Text className="text-neutral-900 font-semibold text-sm">{t('worship.shuffle')}</Text>
            </Pressable>
            {karaokeTracks.length ? (
              <Pressable
                onPress={() => playTracks(karaokeTracks, 0, { source: `${album.judul} · Karaoke`, mode: 'KARAOKE' })}
                className="flex-row items-center gap-1.5 bg-white border border-neutral-300 rounded-full px-4 py-2.5"
              >
                <MicVocal size={16} color="#171717" />
                <Text className="text-neutral-900 font-semibold text-sm">{t('worship.karaoke_all')}</Text>
              </Pressable>
            ) : null}
            {downloadsSupported ? (
              <Pressable
                onPress={async () => {
                  showToast(t('worship.downloading'), 'info');
                  try {
                    for (const x of tracks) await download(x, 'VOKAL');
                    showToast(t('worship.downloaded'), 'success');
                  } catch {
                    showToast(t('worship.download_failed'), 'error');
                  }
                }}
                className="w-10 h-10 rounded-full bg-white border border-neutral-300 items-center justify-center"
              >
                <Download size={16} color="#171717" />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="flex-row gap-2 mt-4 justify-center">
            <Pressable
              disabled={!picked.length}
              onPress={() => {
                void playTracks(picked, 0, { source: t('worship.selection') });
                setSelecting(false);
              }}
              className={`flex-row items-center gap-1.5 rounded-full px-5 py-2.5 ${picked.length ? 'bg-brand-500' : 'bg-neutral-300'}`}
            >
              <Play size={16} color="#fff" fill="#fff" />
              <Text className="text-white font-semibold text-sm">{t('worship.play_selection', { count: picked.length })}</Text>
            </Pressable>
            <Pressable
              disabled={!picked.length}
              onPress={() => {
                addToQueue(picked);
                showToast(t('worship.added_to_queue'), 'success');
                setSelecting(false);
              }}
              className="flex-row items-center gap-1.5 bg-white border border-neutral-300 rounded-full px-4 py-2.5"
            >
              <ListPlus size={16} color="#171717" />
              <Text className="text-neutral-900 font-semibold text-sm">{t('worship.add_to_queue')}</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-4 bg-white rounded-2xl px-3 border border-neutral-100">
          {tracks.map((x, i) => (
            <SongRow
              key={x.id}
              track={x}
              index={i}
              showCover={false}
              selecting={selecting}
              selected={sel.has(x.id)}
              onPress={() => {
                if (selecting) {
                  const n = new Set(sel);
                  if (n.has(x.id)) n.delete(x.id);
                  else n.add(x.id);
                  setSel(n);
                } else void playTracks(tracks, i, { source: album.judul });
              }}
              onMenu={() => setMenu(x)}
            />
          ))}
        </View>
      </ScrollView>
      <SongActionSheet track={menu} onClose={() => setMenu(null)} />
    </View>
  );
}
