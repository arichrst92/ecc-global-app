/**
 * Cari video Video Channel (2.5.1). Pencarian di katalog yang sudah dimuat
 * (judul + kategori); riwayat pencarian disimpan di HP (maks 8).
 */
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Clock, Search, X } from 'lucide-react-native';

import { TextInput } from '@/components/ui/ThemedTextInput';
import { VideoRow, fmtVideoDate } from '@/components/video/VideoChannelView';
import { useDebounce } from '@/hooks/useDebounce';
import { useVideoCatalog } from '@/hooks/useVideos';
import type { VideoItem } from '@/api/videos';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const KEY = 'video_search_recent';
const MAX_RECENT = 8;

export default function VideoSearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const q = useVideoCatalog();
  const [text, setText] = useState('');
  const s = useDebounce(text.trim(), 200);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((r) => setRecent(r ? (JSON.parse(r) as string[]).slice(0, MAX_RECENT) : []))
      .catch(() => {});
  }, []);

  function remember(term: string) {
    const v = term.trim();
    if (!v) return;
    const next = [v, ...recent.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }

  const results = useMemo(() => {
    if (!s) return [];
    const k = s.toLowerCase();
    return (q.data?.videos ?? []).filter((v) => `${v.judul} ${v.kategori?.nama ?? ''}`.toLowerCase().includes(k));
  }, [q.data, s]);

  const open = (v: VideoItem) => {
    remember(s);
    router.push(`/media/video/${v.id}` as never);
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-neutral-50">
        <View className="px-3.5 pt-1 pb-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-[17px] font-extrabold text-neutral-900 flex-1">{t('media.search_title')}</Text>
        </View>
        <View
          className="mx-4 mb-1 flex-row items-center gap-2 bg-card rounded-[14px] px-3"
          style={{ borderWidth: 1.5, borderColor: '#F97316', shadowColor: '#F97316', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }}
        >
          <Search size={18} color="#EA580C" />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => remember(text)}
            returnKeyType="search"
            placeholder={t('media.search_ph')}
            placeholderTextColor={nc('#A3A3A3')}
            className="flex-1 py-2.5 text-[13.5px] text-neutral-900"
          />
          {text ? (
            <Pressable onPress={() => setText('')} hitSlop={8}>
              <X size={18} color={nc('#A3A3A3')} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss} contentContainerStyle={{ paddingBottom: 120 }}>
        {recent.length ? (
          <>
            <Text className="text-[11.5px] text-neutral-500 px-4 pt-3.5 pb-2.5">{t('media.recent')}</Text>
            <View className="flex-row flex-wrap gap-2 px-4">
              {recent.map((r) => (
                <Pressable key={r} onPress={() => setText(r)} className="flex-row items-center gap-1.5 bg-card border border-neutral-200 rounded-full px-[11px] py-1.5 active:opacity-70">
                  <Clock size={12} color={nc('#A3A3A3')} />
                  <Text className="text-xs font-semibold text-neutral-700">{r}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {s ? (
          <>
            <Text className="text-[11.5px] text-neutral-500 px-4 pt-3.5 pb-2.5">
              {results.length ? t('media.result_count', { count: results.length, q: s }) : t('media.search_empty')}
            </Text>
            <View className="px-4 gap-3.5">
              {results.slice(0, 100).map((v) => (
                <VideoRow key={v.id} v={v} onPress={() => open(v)} kategoriPill highlight={s} meta={fmtVideoDate(v.tayangAt, i18n.language)} />
              ))}
            </View>
          </>
        ) : !recent.length ? (
          <Text className="text-sm text-neutral-400 text-center mt-10">{t('media.search_hint')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
