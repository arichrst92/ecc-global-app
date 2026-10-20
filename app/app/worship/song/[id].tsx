/** Deep link ecc://worship/song/:id — putar lagu (lanjut ke lagu berikutnya di albumnya) lalu buka pemutar. */
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tracksOf } from '@/api/worship';
import { useWorshipLibrary } from '@/hooks/useWorship';
import { useWorshipPlayer } from '@/stores/worship-player.store';

export default function WorshipSongLink() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useWorshipLibrary();
  const playTracks = useWorshipPlayer((s) => s.playTracks);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !q.data) return;
    const album = [...q.data.albums, ...q.data.singles].find((a) => a.songs.some((s) => s.id === id));
    done.current = true;
    if (!album) {
      router.replace('/worship' as never);
      return;
    }
    const tracks = tracksOf(album);
    void playTracks(tracks, tracks.findIndex((x) => x.id === id), { source: album.judul });
    router.replace('/worship/player' as never);
  }, [q.data, id, playTracks, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      {q.isError ? <Text className="text-neutral-500">{t('worship.not_found')}</Text> : <ActivityIndicator color="#F97316" />}
    </View>
  );
}
