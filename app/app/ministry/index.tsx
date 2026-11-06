/**
 * Pelayanan (Ministry) — daftar (relayout 2.4.6, persona ECC).
 *
 * - Header oranye: ajakan melayani + jumlah pelayan di cabang aktif + kartu
 *   "Tugas berikutnya" (dari Jadwal Pelayanan Saya).
 * - Pelayanan saya: kartu horizontal (ikon & warna dari Portal, peran saya,
 *   badge permintaan bergabung untuk koordinator).
 * - Jelajahi: grid kartu (ikon, foto anggota, jumlah) + chip saring.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, ChevronRight, HeartHandshake } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MinistryIcon, taglineOf } from '@/components/ministry/MinistryIcon';
import { useMinistryList, useMyMinistrySchedule } from '@/hooks/useMinistry';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { getMyProfile } from '@/api/me';
import { useAuthStore } from '@/stores/auth.store';
import type { MinistryListItem } from '@/types/ministry';
import { formatDateWithDay } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { isDark, nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';

type Filter = 'ALL' | 'MINE' | 'BUKA';

export default function MinistryListScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const ministryListQuery = useMinistryList();
  const scheduleQuery = useMyMinistrySchedule();
  const { branch } = useViewingBranch();
  const [filter, setFilter] = useState<Filter>('ALL');
  const isGuest = useAuthStore((s) => s.isGuest);
  // "Pelayanan saya" dari profil (semua cabang), bukan hanya cabang yang dibuka.
  const meQuery = useQuery({ queryKey: ['me', 'ministry-list'], queryFn: getMyProfile, staleTime: 5 * 60_000, enabled: !isGuest });

  const all = ministryListQuery.data ?? [];
  const pendingById = new Map(all.map((m) => [m.id, m.pendingRequestCount ?? 0]));
  const mineIds = new Set((meQuery.data?.ministries ?? []).map((m) => m.pelayananId));
  const mine = (meQuery.data?.ministries ?? []).map((m) => ({
    id: m.pelayananId,
    nama: m.nama,
    ikon: m.ikon,
    warna: m.warna,
    myPosisi: m.posisi ?? null,
    pendingRequestCount: pendingById.get(m.pelayananId) ?? 0,
  }));
  const totalPelayan = all.reduce((n, m) => n + (m.memberCount ?? 0), 0);
  const buka = all.filter((m) => m.pendaftaran?.status === 'BUKA');
  const shown =
    filter === 'MINE' ? all.filter((m) => mineIds.has(m.id) || !!m.myPosisi) : filter === 'BUKA' ? buka : all;

  // Tugas terdekat (ibadah atau event) dari Jadwal Pelayanan Saya.
  const next = useMemo(() => {
    const d = scheduleQuery.data;
    if (!d) return null;
    const items = [
      ...(d.assignments ?? []).map((a) => ({
        tanggal: String(a.tanggal).slice(0, 10),
        jam: a.ibadahJamMulai ?? '',
        judul: a.ibadahNama,
        ministry: a.ministryNama,
        posisi: a.posisi,
      })),
      ...(d.events ?? []).map((e) => ({
        tanggal: String(e.tanggalMulai).slice(0, 10),
        jam: e.jamMulai ?? '',
        judul: e.judul,
        ministry: e.ministryNama,
        posisi: e.posisi,
      })),
    ].sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
    return items[0] ?? null;
  }, [scheduleQuery.data]);

  return (
    <View className="flex-1 bg-neutral-50">
      <View {...gx('bg-brand-500')}>
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-2 flex-row items-center">
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-base font-bold text-white">{t('ministry.title')}</Text>
            {branch ? (
              <View className="bg-white/20 px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-semibold text-white">{branch.nama}</Text>
              </View>
            ) : null}
          </View>
          <View className="px-5 pb-5 pt-1">
            <Text className="text-white text-2xl font-bold leading-tight">{t('ministry.hero_title')}</Text>
            <Text className="text-white/85 text-xs mt-1">
              {t('ministry.hero_sub', { ministry: all.length, pelayan: totalPelayan })}
            </Text>
            {next ? (
              <Pressable
                onPress={() => router.push('/profile/my-service' as never)}
                className="mt-4 bg-white/20 rounded-2xl p-3 flex-row items-center gap-3"
              >
                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
                  <CalendarClock size={20} color="#C2410C" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] text-white/85">{t('ministry.next_duty')}</Text>
                  <Text className="text-sm font-bold text-white" numberOfLines={1}>
                    {formatDateWithDay(next.tanggal, i18n.language)}
                    {next.jam ? ` · ${next.jam}` : ''}
                  </Text>
                  <Text className="text-[11px] text-white/85" numberOfLines={1}>
                    {next.judul} · {next.ministry} · {next.posisi}
                  </Text>
                </View>
                <ChevronRight size={16} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <PullRefreshControl
            onRefresh={() => Promise.all([ministryListQuery.refetch(), scheduleQuery.refetch(), meQuery.refetch()])}
            tintColor="#F97316"
          />
        }
      >
        {mine.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('ministry.my_section')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-5" contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {mine.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/ministry/${m.id}` as never)}
                  className="bg-card rounded-2xl p-3 border border-neutral-100"
                  style={{ width: 160 }}
                >
                  <MinistryIcon ikon={m.ikon} warna={m.warna} size={36} />
                  <Text className="text-sm font-bold text-neutral-900 mt-2" numberOfLines={1}>
                    {m.nama}
                  </Text>
                  <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                    {m.myPosisi}
                  </Text>
                  {m.pendingRequestCount ? (
                    <View className="self-start mt-1.5 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-amber-800">
                        {t('ministry.pending_badge', { count: m.pendingRequestCount })}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View className="flex-row items-center mb-2">
          <Text className="flex-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('ministry.explore_section')}</Text>
        </View>
        <View className="flex-row gap-1.5 mb-3">
          {(['ALL', 'BUKA', 'MINE'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              {...gx(`px-3 py-1.5 rounded-full border ${filter === f ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`)}
            >
              <Text className={`text-xs font-semibold ${filter === f ? 'text-white' : 'text-neutral-700'}`}>
                {f === 'ALL'
                  ? t('ministry.filter_all', { count: all.length })
                  : f === 'BUKA'
                  ? t('ministry.filter_buka', { count: buka.length })
                  : t('ministry.filter_mine', { count: all.filter((m) => mineIds.has(m.id) || !!m.myPosisi).length })}
              </Text>
            </Pressable>
          ))}
        </View>

        {ministryListQuery.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : ministryListQuery.isError ? (
          <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable onPress={() => ministryListQuery.refetch()} {...gx('px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : shown.length === 0 ? (
          <View className="bg-card rounded-2xl p-5 border border-neutral-100 items-center">
            <View className="w-14 h-14 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <HeartHandshake size={28} color={nc('#A3A3A3')} />
            </View>
            <Text className="text-sm font-semibold text-neutral-700 text-center">{t('ministry.empty_all_title')}</Text>
            <Text className="text-xs text-neutral-500 text-center mt-1 leading-relaxed">{t('ministry.empty_all_msg')}</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -5 }}>
            {shown.map((m) => (
              <View key={m.id} style={{ width: '50%', padding: 5 }}>
                <MinistryTile ministry={m} onPress={() => router.push(`/ministry/${m.id}` as never)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MinistryTile({ ministry: m, onPress }: { ministry: MinistryListItem; onPress: () => void }) {
  const { t } = useTranslation();
  const avatars = m.avatars ?? [];
  const sisa = Math.max(0, (m.memberCount ?? 0) - avatars.length);
  return (
    <Pressable onPress={onPress} className="bg-card rounded-2xl p-3 border border-neutral-100 h-full">
      <View className="flex-row items-start justify-between">
        <MinistryIcon ikon={m.ikon} warna={m.warna} size={38} />
        {m.myPosisi ? (
          <View className="bg-neutral-100 px-1.5 py-0.5 rounded-full">
            <Text className="text-[9px] font-bold text-neutral-600">{t('ministry.badge_mine')}</Text>
          </View>
        ) : m.pendaftaran?.status === 'BUKA' ? (
          <View className="bg-emerald-100 px-1.5 py-0.5 rounded-full">
            <Text className="text-[9px] font-bold text-emerald-800">{t('ministry.pend_status_buka')}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-sm font-bold text-neutral-900 mt-2" numberOfLines={1}>
        {m.nama}
      </Text>
      <Text className="text-[11px] text-neutral-500 mt-0.5" numberOfLines={2}>
        {taglineOf(m.deskripsi) ?? t('ministry.tagline_default')}
      </Text>
      <View className="flex-row items-center mt-2">
        {avatars.map((a, i) => (
          <View key={a.id} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: isDark() ? '#1C1C1E' : '#fff', borderRadius: 999 }}>
            <Avatar name={a.namaLengkap} fotoUrl={a.fotoUrl ?? undefined} size={22} />
          </View>
        ))}
        <Text className="text-[11px] text-neutral-500 ml-1.5">
          {avatars.length ? (sisa ? `+${sisa}` : '') : t('ministry.member_count_short', { count: m.memberCount ?? 0 })}
        </Text>
      </View>
    </Pressable>
  );
}
