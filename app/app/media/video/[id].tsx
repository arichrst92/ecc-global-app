/**
 * Putar video Video Channel (2.5.1): pemutar YouTube di dalam app, judul,
 * kategori, deskripsi, dan video lain dari kategori yang sama.
 * Audio ECC Worship yang sedang diputar dijeda saat video dibuka.
 */
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react-native';

import { YoutubePlayer } from '@/components/video/YoutubePlayer';
import { PlayerBoundary } from '@/components/video/PlayerBoundary';
import { VideoRow, fmtVideoDate } from '@/components/video/VideoChannelView';
import { useVideo } from '@/hooks/useVideos';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const q = useVideo(id);
  const v = q.data;

  useEffect(() => {
    const p = useWorshipPlayer.getState();
    if (p.playing) p.toggle();
  }, [id]);

  const ytUrl = v ? `https://www.youtube.com/watch?v=${v.youtubeId}` : '';

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1" numberOfLines={1}>
            {t('media.tab_video')}
          </Text>
          {v ? (
            <Pressable onPress={() => void Share.share({ message: `${v.judul}\n${ytUrl}` }).catch(() => {})} className="w-10 h-10 items-center justify-center">
              <Share2 size={19} color={nc('#171717')} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : !v ? (
        <Text className="text-sm text-red-600 text-center p-8">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
      ) : (
        <>
          <PlayerBoundary youtubeId={v.youtubeId} label={t('media.open_youtube')}>
            <YoutubePlayer youtubeId={v.youtubeId} />
          </PlayerBoundary>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
            <View className="gap-1">
              <Text className="text-base font-bold text-neutral-900">{v.judul}</Text>
              <Text className="text-xs text-neutral-500">{[v.kategori?.nama, v.channelNama, fmtVideoDate(v.tayangAt, i18n.language)].filter(Boolean).join(' · ')}</Text>
            </View>
            {v.deskripsi ? <Text className="text-sm text-neutral-700 leading-5">{v.deskripsi}</Text> : null}
            <Pressable onPress={() => void Linking.openURL(ytUrl).catch(() => {})} className="flex-row items-center gap-1.5 self-start">
              <ExternalLink size={14} color="#EA580C" />
              <Text className="text-xs font-semibold text-brand-600">{t('media.open_youtube')}</Text>
            </Pressable>
            {v.related.length ? (
              <View className="gap-3 mt-2">
                <Text className="text-sm font-bold text-neutral-900">{v.kategori ? t('media.more_in', { name: v.kategori.nama }) : t('media.more')}</Text>
                {v.related.map((r) => (
                  <VideoRow key={r.id} v={r} onPress={() => router.replace(`/media/video/${r.id}` as never)} />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}
