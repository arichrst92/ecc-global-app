/**
 * Media (2.5.1) — Beranda → Media. Tab ECC Worship (sama persis dengan /worship)
 * dan Video Channel (video YouTube dari Portal). Tab tanpa isi disembunyikan.
 * /media?tab=video membuka tab Video Channel.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search } from 'lucide-react-native';

import { WorshipHomeView } from '../worship';
import { VideoChannelView } from '@/components/video/VideoChannelView';
import { useWorshipSummary } from '@/hooks/useWorship';
import { useVideoSummary } from '@/hooks/useVideos';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

type Tab = 'worship' | 'video';

export default function MediaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'video' ? 'video' : 'worship');
  const ws = useWorshipSummary();
  const vc = useVideoSummary();
  const hasWorship = ws.data ? !!ws.data.hasSongs : true;
  const hasVideo = vc.data ? vc.data.total > 0 : true;
  const tabs: { k: Tab; label: string }[] = [
    ...(hasWorship ? [{ k: 'worship' as Tab, label: 'ECC Worship' }] : []),
    ...(hasVideo ? [{ k: 'video' as Tab, label: t('media.tab_video') }] : []),
  ];
  const active: Tab = tabs.some((x) => x.k === tab) ? tab : (tabs[0]?.k ?? 'worship');

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-neutral-50">
        <View className="px-3.5 pt-1 pb-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-[17px] font-extrabold text-neutral-900 flex-1">{t('media.title')}</Text>
          {active === 'video' ? (
            <Pressable onPress={() => router.push('/media/search' as never)} className="w-9 h-9 items-center justify-center" hitSlop={4}>
              <Search size={19} color={nc('#171717')} />
            </Pressable>
          ) : null}
        </View>
        {tabs.length > 1 ? (
          // Segmented control (2.5.1 relayout)
          <View className="mx-4 mb-2.5 bg-neutral-100 rounded-[14px] p-1 flex-row">
            {tabs.map((x) => {
              const on = active === x.k;
              return (
                <Pressable
                  key={x.k}
                  onPress={() => setTab(x.k)}
                  className={`flex-1 py-2 items-center rounded-[10px] ${on ? 'bg-card' : ''}`}
                  style={on ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : undefined}
                >
                  <Text className={`text-[12.5px] font-bold ${on ? 'text-neutral-900' : 'text-neutral-500'}`}>{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </SafeAreaView>
      {active === 'worship' ? <WorshipHomeView embedded /> : <VideoChannelView />}
    </View>
  );
}
