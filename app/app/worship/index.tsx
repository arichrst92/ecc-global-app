/**
 * ECC Worship — beranda: Album · Single · Disukai · Unduhan, paling sering
 * diputar, cari lagu, Putar semua / Acak semua (lintas album).
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HardDrive, Play, Search, Shuffle, X } from 'lucide-react-native';

import { allTracks, tracksOf, type WorshipTrack } from '@/api/worship';
import { useWorshipLibrary } from '@/hooks/useWorship';
import { downloadsSupported, useWorshipDownloads } from '@/lib/worshipDownloads';
import { useWorshipPlayer } from '@/stores/worship-player.store';
import { Cover } from '@/components/worship/Cover';
import { SongRow } from '@/components/worship/SongRow';
import { SongActionSheet } from '@/components/worship/SongActionSheet';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';

type Tab = 'album' | 'single' | 'liked' | 'downloads';

export default function WorshipHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useWorshipLibrary();
  const lib = q.data;
  const playTracks = useWorshipPlayer((s) => s.playTracks);
  const hydrate = useWorshipDownloads((s) => s.hydrate);
  const entries = useWorshipDownloads((s) => s.entries);
  const removeAll = useWorshipDownloads((s) => s.removeAll);
  const [tab, setTab] = useState<Tab>('album');
  const [search, setSearch] = useState<string | null>(null);
  const [menu, setMenu] = useState<WorshipTrack | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const all = useMemo(() => allTracks(lib), [lib]);
  const byId = useMemo(() => new Map(all.map((x) => [x.id, x])), [all]);
  const singles = useMemo(() => (lib?.singles ?? []).flatMap(tracksOf), [lib]);
  const liked = useMemo(() => (lib?.favorites ?? []).map((id) => byId.get(id)).filter((x): x is WorshipTrack => !!x), [lib, byId]);
  const downloaded = useMemo(() => {
    const ids = new Set(Object.values(entries).map((e) => e.songId));
    return all.filter((x) => ids.has(x.id));
  }, [entries, all]);
  const popular = useMemo(() => (lib?.popular ?? []).map((p) => byId.get(p.songId)).filter((x): x is WorshipTrack => !!x).slice(0, 5), [lib, byId]);
  const results = useMemo(() => {
    const s = (search ?? '').trim().toLowerCase();
    if (!s) return [];
    return all.filter((x) => `${x.judul} ${x.ciptaan ?? ''} ${x.albumJudul}`.toLowerCase().includes(s));
  }, [search, all]);
  const dlSize = Object.values(entries).reduce((a, e) => a + e.size, 0);

  const list = tab === 'single' ? singles : tab === 'liked' ? liked : tab === 'downloads' ? downloaded : [];
  const listSource = tab === 'single' ? 'Single' : tab === 'liked' ? t('worship.tab_liked') : t('worship.tab_downloads');

  const tabs: { k: Tab; label: string }[] = [
    { k: 'album', label: t('worship.tab_album') },
    { k: 'single', label: t('worship.tab_single') },
    { k: 'liked', label: t('worship.tab_liked') },
    ...(downloadsSupported ? [{ k: 'downloads' as Tab, label: t('worship.tab_downloads') }] : []),
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          {search === null ? (
            <>
              <Text className="text-base font-bold text-neutral-900 flex-1">ECC Worship</Text>
              <Pressable onPress={() => setSearch('')} className="w-10 h-10 items-center justify-center">
                <Search size={20} color="#171717" />
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder={t('worship.search_ph')}
                placeholderTextColor="#A3A3A3"
                className="flex-1 bg-neutral-100 rounded-xl px-3 py-2 text-sm text-neutral-900"
              />
              <Pressable onPress={() => setSearch(null)} className="w-10 h-10 items-center justify-center">
                <X size={20} color="#171717" />
              </Pressable>
            </>
          )}
        </View>
        {search === null ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
            {tabs.map((x) => (
              <Pressable
                key={x.k}
                onPress={() => setTab(x.k)}
                {...gx(`px-3.5 py-1.5 rounded-full border ${tab === x.k ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-300'}`)}
              >
                <Text className={`text-xs font-semibold ${tab === x.k ? 'text-white' : 'text-neutral-700'}`}>{x.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>

      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#F97316" />}
        >
          {search !== null ? (
            results.length ? (
              results.map((x) => (
                <SongRow key={x.id} track={x} onPress={() => playTracks(results, results.indexOf(x), { source: t('worship.search_result') })} onMenu={() => setMenu(x)} />
              ))
            ) : (
              <Text className="text-sm text-neutral-400 text-center mt-10">{search.trim() ? t('worship.search_empty') : t('worship.search_hint')}</Text>
            )
          ) : tab === 'album' ? (
            <>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => playTracks(all, 0, { source: t('worship.all_songs') })}
                  {...gx('flex-1 flex-row items-center justify-center gap-2 bg-brand-500 rounded-full py-2.5')}
                >
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text className="text-white font-semibold text-sm">{t('worship.play_all')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => playTracks(all, -1, { source: t('worship.all_songs'), shuffle: true })}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-white border border-neutral-300 rounded-full py-2.5"
                >
                  <Shuffle size={16} color="#171717" />
                  <Text className="text-neutral-900 font-semibold text-sm">{t('worship.shuffle_all')}</Text>
                </Pressable>
              </View>
              {(lib?.albums.length ?? 0) > 0 ? (
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
                  {lib!.albums.map((a) => (
                    <Pressable key={a.id} onPress={() => router.push(`/worship/album/${a.id}` as never)} style={{ width: '50%', padding: 6 }}>
                      <View className="aspect-square w-full">
                        <AlbumCover url={a.coverUrl} />
                      </View>
                      <Text className="mt-1.5 text-sm font-semibold text-neutral-900" numberOfLines={1}>
                        {a.judul}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        {[a.tahun, t('worship.n_songs', { count: a.songs.length }), a.draft ? 'Draft' : null].filter(Boolean).join(' · ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {singles.length ? (
                <>
                  <Text className="text-sm font-bold text-neutral-900 mt-5 mb-1">{t('worship.tab_single')}</Text>
                  {singles.slice(0, 3).map((x) => (
                    <SongRow key={x.id} track={x} onPress={() => playTracks(singles, singles.indexOf(x), { source: 'Single' })} onMenu={() => setMenu(x)} />
                  ))}
                </>
              ) : null}
              {popular.length ? (
                <>
                  <Text className="text-sm font-bold text-neutral-900 mt-5 mb-1">{t('worship.popular')}</Text>
                  {popular.map((x) => (
                    <SongRow key={x.id} track={x} onPress={() => playTracks(popular, popular.indexOf(x), { source: t('worship.popular') })} onMenu={() => setMenu(x)} />
                  ))}
                </>
              ) : null}
            </>
          ) : (
            <>
              {tab === 'downloads' && downloaded.length ? (
                <View className="bg-white rounded-2xl border border-neutral-100 p-3 flex-row items-center gap-3 mb-3">
                  <HardDrive size={20} color="#525252" />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {t('worship.n_songs', { count: downloaded.length })} · {(dlSize / 1024 / 1024).toFixed(0)} MB
                    </Text>
                    <Text className="text-xs text-neutral-500">{t('worship.offline_hint')}</Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert(t('worship.remove_all_title'), '', [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('worship.remove_all'), style: 'destructive', onPress: () => void removeAll() },
                      ])
                    }
                  >
                    <Text className="text-xs font-semibold text-red-600">{t('worship.remove_all')}</Text>
                  </Pressable>
                </View>
              ) : null}
              {list.length ? (
                <>
                  <View className="flex-row gap-2 mb-2">
                    <Pressable onPress={() => playTracks(list, 0, { source: listSource })} {...gx('flex-row items-center gap-1.5 bg-brand-500 rounded-full px-4 py-2')}>
                      <Play size={14} color="#fff" fill="#fff" />
                      <Text className="text-white font-semibold text-xs">{t('worship.play')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => playTracks(list, -1, { source: listSource, shuffle: true })}
                      className="flex-row items-center gap-1.5 bg-white border border-neutral-300 rounded-full px-4 py-2"
                    >
                      <Shuffle size={14} color="#171717" />
                      <Text className="text-neutral-900 font-semibold text-xs">{t('worship.shuffle')}</Text>
                    </Pressable>
                  </View>
                  {list.map((x, i) => (
                    <SongRow key={x.id} track={x} onPress={() => playTracks(list, i, { source: listSource })} onMenu={() => setMenu(x)} />
                  ))}
                </>
              ) : (
                <Text className="text-sm text-neutral-400 text-center mt-10">
                  {tab === 'liked' ? t('worship.empty_liked') : tab === 'downloads' ? t('worship.empty_downloads') : t('worship.empty')}
                </Text>
              )}
            </>
          )}
        </ScrollView>
      )}
      <SongActionSheet track={menu} onClose={() => setMenu(null)} />
    </View>
  );
}

function AlbumCover({ url }: { url: string | null }) {
  const [w, setW] = useState(0);
  return (
    <View className="flex-1" onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <Cover url={url} size={w} radius={14} /> : null}
    </View>
  );
}
