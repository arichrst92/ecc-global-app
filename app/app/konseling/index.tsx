/**
 * Konseling (2.5.1) — Profil → Konseling. Tab "Konseling Saya" + "Ditugaskan ke Saya"
 * (hanya untuk konselor = anggota pelayanan yang diatur di Portal).
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarClock, ChevronRight, Lock, Plus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { FilterTabs } from '@/components/doa/DoaBits';
import { KonselingStatusBadge, fmtWhen } from '@/components/konseling/KonselingBits';
import { getKonselingHome, listAssignedKonseling } from '@/api/konseling';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';
import { PullRefreshControl } from '@/components/ui/PullRefreshControl';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { ApiError } from '@/types/api';

type MainTab = 'mine' | 'assigned';

export default function KonselingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<MainTab>(params.tab === 'assigned' ? 'assigned' : 'mine');
  const home = useQuery({ queryKey: ['konseling', 'home'], queryFn: getKonselingHome });
  const showAssigned = !!home.data?.isKonselor;
  const active: MainTab = showAssigned ? tab : 'mine';

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('konseling.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('konseling.subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.push('/konseling/new' as never)} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>
        {showAssigned ? (
          <View className="flex-row">
            {(['mine', 'assigned'] as const).map((k) => {
              const on = active === k;
              const n = home.data?.assignedOpen ?? 0;
              return (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  className={`flex-1 py-2.5 items-center flex-row justify-center gap-1.5 border-b-2 ${on ? 'border-brand-500' : 'border-transparent'}`}
                >
                  <Text className={`text-sm font-semibold flex-shrink ${on ? 'text-brand-600' : 'text-neutral-500'}`} numberOfLines={1}>
                    {k === 'mine' ? t('konseling.tab_mine') : t('konseling.tab_assigned')}
                  </Text>
                  {k === 'assigned' && n > 0 ? (
                    <View className="bg-red-500 rounded-full px-1.5 min-w-[18px] items-center">
                      <Text className="text-[10px] font-bold text-white">{n}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </SafeAreaView>
      {active === 'mine' ? <MineList /> : <AssignedList />}
    </View>
  );
}

function MineList() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['konseling', 'home'], queryFn: getKonselingHome });
  const rows = q.data?.items ?? [];
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
      refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} tintColor="#F97316" />}
    >
      <View className="flex-row items-center gap-2 bg-card rounded-xl border border-neutral-100 px-3 py-2.5">
        <Lock size={14} color={nc('#737373')} />
        <Text className="flex-1 text-xs text-neutral-600">{t('konseling.privacy_note')}</Text>
      </View>
      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : q.isError ? (
        <Text className="text-sm text-red-600 text-center py-10">{q.error instanceof ApiError ? q.error.message : t('error.generic')}</Text>
      ) : rows.length === 0 ? (
        <View className="items-center py-14 px-6">
          <ElsEmptyIcon size={56} className="mb-3" />
          <Text className="text-base font-bold text-neutral-900 text-center">{t('konseling.empty_title')}</Text>
          <Text className="text-sm text-neutral-500 text-center mt-1 mb-5">{t('konseling.empty_body')}</Text>
          <Button label={t('konseling.new')} onPress={() => router.push('/konseling/new' as never)} />
        </View>
      ) : (
        <>
          {rows.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/konseling/${r.id}` as never)}
              className="bg-card rounded-2xl border border-neutral-100 p-4 flex-row items-center gap-3"
            >
              <View className="flex-1 min-w-0 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[11px] text-neutral-400 flex-1">{fmtWhen(r.createdAt, i18n.language)}</Text>
                  <KonselingStatusBadge status={r.status} />
                </View>
                <Text className="text-sm text-neutral-800" numberOfLines={2}>
                  {r.pokokMasalah}
                </Text>
                {r.konselor ? (
                  <Text className="text-[11px] text-neutral-500">{t('konseling.counselor_is', { name: r.konselor.namaLengkap })}</Text>
                ) : null}
                {r.jadwalFinal && r.status === 'DIJADWALKAN' ? (
                  <View className="flex-row items-center gap-1">
                    <CalendarClock size={12} color="#7C3AED" />
                    <Text className="text-[11px] font-semibold text-violet-700">{fmtWhen(r.jadwalFinal, i18n.language)}</Text>
                  </View>
                ) : null}
              </View>
              <ChevronRight size={16} color={nc('#A3A3A3')} />
            </Pressable>
          ))}
          <View className="mt-2">
            <Button label={t('konseling.new')} onPress={() => router.push('/konseling/new' as never)} leftIcon={<Plus size={18} color="#fff" />} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function AssignedList() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'aktif' | 'riwayat'>('aktif');
  const q = useQuery({ queryKey: ['konseling', 'assigned', filter], queryFn: () => listAssignedKonseling(filter) });
  const rows = q.data ?? [];
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
      refreshControl={
        <PullRefreshControl onRefresh={() => Promise.all([q.refetch(), qc.invalidateQueries({ queryKey: ['konseling', 'home'] })])} tintColor="#F97316" />
      }
    >
      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'aktif', label: t('konseling.filter_active') },
          { value: 'riwayat', label: t('konseling.filter_history') },
        ]}
      />
      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <Text className="text-sm text-neutral-400 text-center py-14">{filter === 'aktif' ? t('konseling.empty_assigned') : t('konseling.empty_history')}</Text>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push(`/konseling/${r.id}?as=konselor` as never)}
            className="bg-card rounded-2xl p-4 border border-neutral-100 gap-1.5"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-neutral-900 flex-1" numberOfLines={1}>
                {r.jemaat?.namaLengkap ?? '—'}
              </Text>
              <KonselingStatusBadge status={r.status} />
            </View>
            <Text className="text-sm text-neutral-800" numberOfLines={3}>
              {r.pokokMasalah}
            </Text>
            <Text className="text-[11px] text-neutral-400">
              {r.jadwalFinal
                ? t('konseling.scheduled_at', { date: fmtWhen(r.jadwalFinal, i18n.language) })
                : r.jadwalUsulan
                  ? t('konseling.proposed_at', { date: fmtWhen(r.jadwalUsulan, i18n.language) })
                  : t('konseling.no_proposal')}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
