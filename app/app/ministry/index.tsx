/**
 * Ministry list page — per BE patch 2026-05-22a.
 *
 * Diakses dari Quick Access tile "Ministry" di dashboard dan dari MinistryCard
 * di profile (CTA "Belum terlibat ministry").
 *
 * Sections:
 * - "Pelayanan Saya" — dari /admin/me.ministries (kalau ada)
 * - "Semua Ministry" — dari /admin/ministry (semua aktif)
 */
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, HeartHandshake, Users } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { getMyProfile } from '@/api/me';
import { useMinistryList } from '@/hooks/useMinistry';

export default function MinistryListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me', 'ministry-list'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });
  const ministryListQuery = useMinistryList();

  const myMinistries = meQuery.data?.ministries ?? [];
  const allMinistries = ministryListQuery.data ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('ministry.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={ministryListQuery.isRefetching}
            onRefresh={() => {
              ministryListQuery.refetch();
              meQuery.refetch();
            }}
            tintColor="#F97316"
          />
        }
      >
        {/* Section: Pelayanan Saya */}
        {myMinistries.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {t('ministry.my_section')}
            </Text>
            <View className="bg-white rounded-2xl border border-neutral-100 mb-6">
              {myMinistries.map((m, idx) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/ministry/${m.pelayananId}` as never)}
                  className={`p-4 flex-row items-center gap-3 ${
                    idx > 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                    <HeartHandshake size={18} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {m.nama}
                    </Text>
                    {m.posisi ? (
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {m.posisi}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color="#A3A3A3" />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* Section: All ministries */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('ministry.all_section')}
        </Text>
        {ministryListQuery.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : ministryListQuery.isError ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
            <Text className="text-sm text-red-600 text-center mb-3">
              {t('error.generic')}
            </Text>
            <Pressable
              onPress={() => ministryListQuery.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : allMinistries.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center">
            <View className="w-14 h-14 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <HeartHandshake size={28} color="#A3A3A3" />
            </View>
            <Text className="text-sm font-semibold text-neutral-700 text-center">
              {t('ministry.empty_all_title')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center mt-1 leading-relaxed">
              {t('ministry.empty_all_msg')}
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {allMinistries.map((m) => (
              <MinistryRow
                key={m.id}
                ministry={m}
                onPress={() => router.push(`/ministry/${m.id}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MinistryRow({
  ministry,
  onPress,
}: {
  ministry: {
    id: string;
    nama: string;
    deskripsi: string | null;
    memberCount: number;
    isOpen: boolean;
    leader: {
      jemaat: { id: string; namaLengkap: string; fotoUrl?: string | null };
    } | null;
  };
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
    >
      <View className="w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center">
        <HeartHandshake size={22} color="#EA580C" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
          {ministry.nama}
        </Text>
        {ministry.deskripsi ? (
          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
            {ministry.deskripsi}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-3 mt-1.5">
          <View className="flex-row items-center gap-1">
            <Users size={11} color="#737373" />
            <Text className="text-[11px] text-neutral-500">
              {ministry.memberCount} {t('ministry.member_label')}
            </Text>
          </View>
          {ministry.leader ? (
            <View className="flex-row items-center gap-1 flex-1">
              <Avatar
                name={ministry.leader.jemaat.namaLengkap}
                fotoUrl={ministry.leader.jemaat.fotoUrl ?? undefined}
                size={14}
              />
              <Text
                className="text-[11px] text-neutral-500 flex-1"
                numberOfLines={1}
              >
                {ministry.leader.jemaat.namaLengkap}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color="#A3A3A3" />
    </Pressable>
  );
}
