import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MapPin, MessageCircle, Minus, Phone, Plus, UserSearch } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { listPotensialMember, type PotensialMemberItem } from '@/api/homecell';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const RADIUS_MIN = 0.5;
const RADIUS_MAX = 50;

function formatJarak(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('id-ID', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/**
 * Cari potensial member (2.4.6) — jemaat aktif yang belum ikut homecell dan
 * rumahnya (perkiraan dari alamat) dalam radius X km dari titik homecell.
 * Untuk pemimpin homecell / PIC & pastor zona. No HP & usia mengikuti privasi.
 */
export default function HomecellPotensialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [radius, setRadius] = useState(3);
  const [debounced, setDebounced] = useState(3);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(radius), 400);
    return () => clearTimeout(h);
  }, [radius]);

  const query = useQuery({
    queryKey: ['homecell', 'potensial', id, debounced],
    queryFn: () => listPotensialMember(id!, debounced),
    enabled: !!id,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const step = (dir: 1 | -1) =>
    setRadius((r) => {
      const d = r < 2 || (r === 2 && dir < 0) ? 0.5 : 1;
      return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round((r + dir * d) * 10) / 10));
    });

  const data = query.data;
  const errMsg = query.error instanceof ApiError ? query.error.message : query.isError ? t('error.generic') : null;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('homecell.potensial_title')}</Text>
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {data?.homecell.nama ?? ''}
            </Text>
          </View>
        </View>
        {/* Radius */}
        <View className="px-5 pb-3 flex-row items-center gap-3">
          <Text className="text-sm text-neutral-700 font-medium">{t('homecell.potensial_radius')}</Text>
          <View className="flex-row items-center border border-neutral-200 rounded-full overflow-hidden">
            <Pressable
              onPress={() => step(-1)}
              disabled={radius <= RADIUS_MIN}
              className={`w-10 h-9 items-center justify-center ${radius <= RADIUS_MIN ? 'opacity-30' : ''}`}
              accessibilityLabel="-"
            >
              <Minus size={16} color={nc('#171717')} />
            </Pressable>
            <Text className="min-w-[64px] text-center text-base font-bold text-neutral-900">
              {radius.toLocaleString('id-ID')} km
            </Text>
            <Pressable
              onPress={() => step(1)}
              disabled={radius >= RADIUS_MAX}
              className={`w-10 h-9 items-center justify-center ${radius >= RADIUS_MAX ? 'opacity-30' : ''}`}
              accessibilityLabel="+"
            >
              <Plus size={16} color={nc('#171717')} />
            </Pressable>
          </View>
          {query.isFetching ? <ActivityIndicator size="small" color="#F97316" /> : null}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<PullRefreshControl onRefresh={() => query.refetch()} />}
      >
        {!data && query.isPending ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : errMsg ? (
          <View className="items-center py-16 px-6">
            <Text className="text-sm text-red-600 text-center">{errMsg}</Text>
          </View>
        ) : data ? (
          <>
            <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">
              {t('homecell.potensial_intro', { count: data.total, radius: data.radiusKm.toLocaleString('id-ID') })}
            </Text>
            {data.data.length === 0 ? (
              <View className="items-center py-12 px-6">
                <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
                  <UserSearch size={28} color={nc('#A3A3A3')} />
                </View>
                <Text className="text-sm text-neutral-500 text-center">{t('homecell.potensial_empty')}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {data.data.map((m) => (
                  <PotensialRow key={m.id} m={m} />
                ))}
                {data.total > data.data.length ? (
                  <Text className="text-xs text-neutral-500 text-center mt-2">
                    {t('homecell.potensial_more', { shown: data.data.length, total: data.total })}
                  </Text>
                ) : null}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PotensialRow({ m }: { m: PotensialMemberItem }) {
  const { t } = useTranslation();
  const router = useRouter();
  const wa = m.noHp ? m.noHp.replace(/\D/g, '') : null;
  const sub = [
    m.jenisKelamin === 'L' ? t('homecell.potensial_pria') : m.jenisKelamin === 'P' ? t('homecell.potensial_wanita') : null,
    m.usia != null ? t('homecell.potensial_usia', { usia: m.usia }) : null,
    m.cabang.nama,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() => router.push(`/jemaat/${m.id}` as never)}
      className="bg-card rounded-2xl p-3 flex-row items-center gap-3 border border-neutral-100 active:bg-neutral-50"
      accessibilityRole="button"
      accessibilityLabel={m.namaLengkap}
    >
      <Avatar name={m.namaLengkap} fotoUrl={m.fotoUrl} size={44} />
      <View className="flex-1 min-w-0">
        <Text className="font-semibold text-neutral-900" numberOfLines={1}>
          {m.namaLengkap}
        </Text>
        <Text className="text-xs text-neutral-500" numberOfLines={1}>
          {sub}
        </Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <MapPin size={11} color="#059669" />
          <Text className="text-xs font-semibold text-emerald-700">{formatJarak(m.jarakKm)}</Text>
        </View>
      </View>
      {wa ? (
        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => Linking.openURL(`tel:${m.noHp}`)}
            className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
            accessibilityLabel={t('homecell.potensial_call')}
          >
            <Phone size={16} color={nc('#404040')} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`https://wa.me/${wa}`)}
            className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center"
            accessibilityLabel="WhatsApp"
          >
            <MessageCircle size={16} color="#059669" />
          </Pressable>
        </View>
      ) : (
        <ChevronRight size={16} color={nc('#A3A3A3')} />
      )}
    </Pressable>
  );
}
