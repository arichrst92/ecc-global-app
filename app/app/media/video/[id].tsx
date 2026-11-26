/**
 * Putar video Video Channel (2.5.1, relayout): bagian atas gelap (pemutar
 * YouTube di dalam app), isi di sheet terang membulat — judul, meta, aksi
 * (Bagikan / Salin tautan / YouTube), deskripsi dilipat, "Berikutnya di
 * kategori". Audio ECC Worship yang sedang diputar dijeda saat video dibuka.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, ExternalLink, Link2, List, Share2 } from 'lucide-react-native';

import { YoutubePlayer } from '@/components/video/YoutubePlayer';
import { PlayerBoundary } from '@/components/video/PlayerBoundary';
import { VideoRow, fmtVideoDate, videoMeta } from '@/components/video/VideoChannelView';
import { useToast } from '@/components/ui/Toast';
import { useVideo } from '@/hooks/useVideos';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const DARK = '#0B0B0B';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const q = useVideo(id);
  const v = q.data;
  const [descOpen, setDescOpen] = useState(false);

  useEffect(() => {
    const p = useWorshipPlayer.getState();
    if (p.playing) p.toggle();
    setDescOpen(false);
  }, [id]);

  const ytUrl = v ? `https://www.youtube.com/watch?v=${v.youtubeId}` : '';
  const longDesc = (v?.deskripsi?.length ?? 0) > 160 || (v?.deskripsi?.split('\n').length ?? 0) > 3;

  const actions = v
    ? [
        { key: 'share', icon: Share2, label: t('media.share'), on: () => void Share.share({ message: `${v.judul}\n${ytUrl}` }).catch(() => {}) },
        {
          key: 'copy',
          icon: Link2,
          label: t('media.copy_link'),
          on: () =>
            void Clipboard.setStringAsync(ytUrl)
              .then(() => showToast(t('media.link_copied'), 'success'))
              .catch(() => {}),
        },
        { key: 'yt', icon: ExternalLink, label: 'YouTube', on: () => void Linking.openURL(ytUrl).catch(() => {}) },
      ]
    : [];

  return (
    <View className="flex-1" style={{ backgroundColor: DARK }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: DARK }}>
        <View className="px-3.5 pt-1 pb-2 flex-row items-center gap-2">
          <Pressable
            onPress={() => goBack(router)}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={19} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
            {v?.kategori?.nama ?? t('media.tab_video')}
          </Text>
        </View>
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : !v ? (
        <Text className="text-sm text-center p-8" style={{ color: '#FCA5A5' }}>
          {q.error instanceof ApiError ? q.error.message : t('error.generic')}
        </Text>
      ) : (
        <>
          <PlayerBoundary youtubeId={v.youtubeId} label={t('media.open_youtube')}>
            <YoutubePlayer youtubeId={v.youtubeId} />
          </PlayerBoundary>
          <View className="flex-1 bg-neutral-50 overflow-hidden" style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: 6 }}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
              <Text className="px-[18px] text-lg font-extrabold text-neutral-900 leading-[23px]">{v.judul}</Text>
              <Text className="px-[18px] pt-1.5 text-[11.5px] text-neutral-500">
                {videoMeta([v.kategori?.nama, v.channelNama, fmtVideoDate(v.tayangAt, i18n.language)])}
              </Text>

              <View className="flex-row gap-2 px-[18px] pt-3.5 pb-1">
                {actions.map(({ key, icon: Icon, label, on }) => (
                  <Pressable key={key} onPress={on} className="flex-1 items-center gap-1 bg-card border border-neutral-200 rounded-[14px] pt-2.5 pb-2 active:opacity-70">
                    <Icon size={17} color={nc('#404040')} />
                    <Text className="text-[10.5px] font-bold text-neutral-700">{label}</Text>
                  </Pressable>
                ))}
              </View>

              {v.deskripsi ? (
                <View className="mx-[18px] mt-3 bg-card border border-neutral-100 rounded-2xl px-3.5 py-3">
                  <Text className="text-[11px] font-bold text-neutral-500 tracking-wider mb-1">{t('media.about')}</Text>
                  <Text className="text-[12.5px] text-neutral-700 leading-[19px]" numberOfLines={descOpen ? undefined : 3}>
                    {v.deskripsi}
                  </Text>
                  {longDesc ? (
                    <Pressable onPress={() => setDescOpen((o) => !o)} hitSlop={6}>
                      <Text className="text-xs font-bold text-brand-600 mt-1">{descOpen ? t('media.show_less') : t('media.show_more')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {v.related.length ? (
                <>
                  <View className="flex-row items-end justify-between px-4 pt-4 pb-2.5">
                    <Text className="text-[15.5px] font-bold text-neutral-900 flex-1" numberOfLines={1}>
                      {v.kategori ? t('media.next_in', { name: v.kategori.nama }) : t('media.more')}
                    </Text>
                    {v.kategori ? (
                      <Pressable onPress={() => router.push(`/media/kategori/${v.kategori!.id}` as never)} hitSlop={8}>
                        <List size={16} color="#EA580C" />
                      </Pressable>
                    ) : null}
                  </View>
                  <View className="px-4 gap-3.5">
                    {v.related.map((r) => (
                      <VideoRow
                        key={r.id}
                        v={r}
                        meta={fmtVideoDate(r.tayangAt, i18n.language)}
                        onPress={() => router.replace(`/media/video/${r.id}` as never)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
