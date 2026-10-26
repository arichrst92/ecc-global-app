/**
 * Homecell — untuk SEMUA jemaat.
 *
 * - Pemimpin (PIC): homecell yang dipimpin (kelola) + banner permintaan bergabung.
 * - Anggota: "Homecell Saya" → detail read-only.
 * - Belum punya homecell: daftar homecell di cabang + "Cari homecell terdekat"
 *   (GPS) → popup rekomendasi → minta bergabung.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, ChevronRight, Hourglass, Locate, MapPin, Search, Settings2 } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { HomecellListCard } from '@/components/homecell/HomecellListCard';
import { NearestHomecellModal } from '@/components/homecell/NearestHomecellModal';
import {
  useBrowseHomecells,
  useCancelJoinHomecell,
  useMyHomecellOverview,
  useRequestJoinHomecell,
} from '@/hooks/useHomecell';
import { nearestHomecells } from '@/api/homecell';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { getCurrentCoords, LocationError, type Coords } from '@/utils/location';
import { ApiError } from '@/types/api';
import type { HomecellNearestResponse } from '@/types/homecell';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export default function HomecellHubScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const overview = useMyHomecellOverview();
  const data = overview.data;
  const managed = data?.managed ?? [];
  const memberships = data?.memberships ?? [];
  const pending = data?.pendingRequests ?? [];
  const needsHomecell = !!data && managed.length === 0 && memberships.length === 0;

  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [coords, setCoords] = useState<Coords | null>(null);
  // Daftar & rekomendasi mengikuti cabang aktif yang dipilih di app.
  const { branch, viewingCabangId, isLoading: branchLoading } = useViewingBranch();
  const browse = useBrowseHomecells(
    { cabangId: viewingCabangId, q, lat: coords?.lat, lng: coords?.lng },
    needsHomecell && !branchLoading,
  );

  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState<HomecellNearestResponse | null>(null);
  const [nearestOpen, setNearestOpen] = useState(false);
  const joinMut = useRequestJoinHomecell();
  const cancelMut = useCancelJoinHomecell();

  const pendingJoinTotal = managed.reduce((a, h) => a + (h.pendingJoinCount ?? 0), 0);

  // Dari tombol "Cari homecell terdekat" di beranda → langsung cari sekali.
  const params = useLocalSearchParams<{ nearest?: string }>();
  const autoNearestDone = useRef(false);
  useEffect(() => {
    if (params.nearest === '1' && needsHomecell && !branchLoading && !autoNearestDone.current) {
      autoNearestDone.current = true;
      void findNearest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.nearest, needsHomecell, branchLoading]);

  async function findNearest() {
    setLocating(true);
    try {
      const c = await getCurrentCoords();
      setCoords(c);
      const res = await nearestHomecells(c.lat, c.lng, viewingCabangId, 3);
      setNearest(res);
      setNearestOpen(true);
    } catch (e) {
      if (e instanceof LocationError) {
        showToast(e.reason === 'DENIED' ? t('hcj.loc_denied') : t('hcj.loc_unavailable'), 'error');
      } else {
        showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
      }
    } finally {
      setLocating(false);
    }
  }

  function join(homecellId: string) {
    joinMut.mutate(
      { homecellId },
      {
        onSuccess: () => {
          setNearestOpen(false);
          showToast(t('hcj.join_sent'), 'success');
        },
        onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
      },
    );
  }

  function cancel(homecellId: string, nama: string) {
    Alert.alert(t('hcj.cancel_request'), t('hcj.cancel_confirm', { name: nama }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('hcj.cancel_request'),
        style: 'destructive',
        onPress: () =>
          cancelMut.mutate(homecellId, {
            onSuccess: () => showToast(t('hcj.cancelled'), 'success'),
            onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
          }),
      },
    ]);
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('hcj.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('hcj.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefetching}
            onRefresh={() => {
              void overview.refetch();
              if (needsHomecell) void browse.refetch();
            }}
            tintColor="#F97316"
          />
        }
      >
        {overview.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : overview.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable onPress={() => overview.refetch()} {...gx('px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ===== Pemimpin ===== */}
            {managed.length > 0 ? (
              <View className="mb-6">
                <SectionTitle text={t('hcj.led_section')} />
                {pendingJoinTotal > 0 ? (
                  <Pressable
                    onPress={() => router.push('/homecell/requests' as never)}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex-row items-center gap-3 mb-2"
                  >
                    <Bell size={18} color={nc('#B45309')} />
                    <Text className="flex-1 text-sm font-semibold text-amber-900">
                      {t('hcj.requests_banner', { count: pendingJoinTotal })}
                    </Text>
                    <ChevronRight size={16} color={nc('#B45309')} />
                  </Pressable>
                ) : null}
                <View className="gap-2">
                  {managed.map((h) => (
                    <View key={h.id}>
                      <HomecellListCard item={h} onPress={() => router.push(`/homecell/${h.id}`)} />
                      <Pressable
                        onPress={() => router.push(`/homecell/view/${h.id}` as never)}
                        className="flex-row items-center gap-1 self-end mt-1 px-2 py-1"
                      >
                        <Settings2 size={12} color="#EA580C" />
                        <Text className="text-xs font-semibold text-brand-600">{t('hcj.info_location')}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* ===== Anggota ===== */}
            {memberships.length > 0 ? (
              <View className="mb-6">
                <SectionTitle text={t('hcj.my_section')} />
                <View className="gap-2">
                  {memberships.map((m) => (
                    <HomecellListCard
                      key={m.homecell.id}
                      item={m.homecell}
                      onPress={() => router.push(`/homecell/view/${m.homecell.id}` as never)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* ===== Belum punya homecell ===== */}
            {needsHomecell ? (
              <View>
                <Text className="text-sm text-neutral-600 mb-3">{t('hcj.find_intro')}</Text>

                {pending.map((p) => (
                  <View
                    key={p.id}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex-row items-center gap-3"
                  >
                    <Hourglass size={18} color={nc('#B45309')} />
                    <Pressable
                      className="flex-1"
                      onPress={() => router.push(`/homecell/view/${p.homecell.id}` as never)}
                    >
                      <Text className="text-sm font-semibold text-amber-900">
                        {t('hcj.pending_card', { name: p.homecell.nama })}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => cancel(p.homecell.id, p.homecell.nama)} hitSlop={8}>
                      <Text className="text-xs font-semibold text-red-600">{t('hcj.cancel_request')}</Text>
                    </Pressable>
                  </View>
                ))}

                <Button
                  label={locating ? t('hcj.locating') : t('hcj.nearest_btn')}
                  loading={locating}
                  onPress={findNearest}
                  leftIcon={<Locate size={18} color="#fff" />}
                />

                <View className="mt-5 mb-2">
                  <SectionTitle
                    text={
                      branch
                        ? t('hcj.find_section', { cabang: branch.nama })
                        : t('hcj.find_section_nocabang')
                    }
                  />
                </View>
                <View className="flex-row items-center bg-card border border-neutral-200 rounded-xl px-3 mb-3">
                  <Search size={16} color={nc('#A3A3A3')} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('hcj.search_placeholder')}
                    placeholderTextColor={nc('#A3A3A3')}
                    className="flex-1 px-2 py-3 text-sm text-neutral-900"
                  />
                </View>

                {browse.isPending ? (
                  <View className="items-center py-10">
                    <ActivityIndicator color="#F97316" />
                  </View>
                ) : (browse.data ?? []).length === 0 ? (
                  <View className="items-center py-10 px-6">
                    <MapPin size={28} color={nc('#A3A3A3')} />
                    <Text className="text-sm text-neutral-500 text-center mt-2">{t('hcj.list_empty')}</Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {(browse.data ?? []).map((h) => (
                      <HomecellListCard
                        key={h.id}
                        item={h}
                        onPress={() => router.push(`/homecell/view/${h.id}` as never)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <NearestHomecellModal
        visible={nearestOpen}
        data={nearest}
        joiningId={joinMut.isPending ? (joinMut.variables?.homecellId ?? null) : null}
        hasPending={pending.length > 0}
        onClose={() => setNearestOpen(false)}
        onDetail={(id) => {
          setNearestOpen(false);
          router.push(`/homecell/view/${id}` as never);
        }}
        onJoin={join}
      />
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{text}</Text>;
}
