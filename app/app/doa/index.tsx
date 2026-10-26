/**
 * Doa — prayer request saya (Aktif / Terjawab) + tab "Ditugaskan ke Saya"
 * untuk petugas doa. Masuk dari tile Doa di Home atau menu Profil.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, EyeOff, HandHeart, Plus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  deletePrayer,
  getPrayerSummary,
  listAssignedPrayers,
  listMyPrayers,
  type AssignedPrayer,
  type Prayer,
} from '@/api/prayer';
import { Chip, FilterTabs, PrayerStatusBadge, fmtDate, untukLabel } from '@/components/doa/DoaBits';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

type MainTab = 'mine' | 'assigned';

export default function DoaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<MainTab>(params.tab === 'assigned' ? 'assigned' : 'mine');

  const summaryQ = useQuery({ queryKey: ['prayer', 'summary'], queryFn: getPrayerSummary });
  const s = summaryQ.data;
  const showAssigned = !!s?.isPetugas;
  const active: MainTab = showAssigned ? tab : 'mine';

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('doa.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('doa.subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.push('/doa/form' as never)} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>
        {showAssigned ? (
          <View className="flex-row">
            {(['mine', 'assigned'] as const).map((k) => {
              const on = active === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  className={`flex-1 py-2.5 items-center flex-row justify-center gap-1.5 border-b-2 ${on ? 'border-brand-500' : 'border-transparent'}`}
                >
                  <Text className={`text-sm font-semibold ${on ? 'text-brand-600' : 'text-neutral-500'}`}>
                    {k === 'mine' ? t('doa.tab_mine') : t('doa.tab_assigned')}
                  </Text>
                  {k === 'assigned' && s && s.assignedPending > 0 ? (
                    <View className="bg-red-500 rounded-full px-1.5 min-w-[18px] items-center">
                      <Text className="text-[10px] font-bold text-white">{s.assignedPending}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </SafeAreaView>

      {active === 'mine' ? (
        <MineList aktif={s?.aktif} terjawab={s?.terjawab} />
      ) : (
        <AssignedList />
      )}
    </View>
  );
}

function MineList({ aktif, terjawab }: { aktif?: number; terjawab?: number }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((st) => st.show);
  const [filter, setFilter] = useState<'aktif' | 'terjawab'>('aktif');
  const q = useQuery({ queryKey: ['prayer', 'mine', filter], queryFn: () => listMyPrayers(filter) });
  const rows = q.data ?? [];

  const delMut = useMutation({
    mutationFn: (id: string) => deletePrayer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prayer'] });
      showToast(t('doa.deleted'), 'success');
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const confirmDelete = (p: Prayer) =>
    Alert.alert(t('doa.delete_title'), t('doa.delete_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('doa.delete'), style: 'destructive', onPress: () => delMut.mutate(p.id) },
    ]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => {
            q.refetch();
            qc.invalidateQueries({ queryKey: ['prayer', 'summary'] });
          }}
          tintColor="#F97316"
        />
      }
    >
      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'aktif', label: t('doa.filter_aktif'), count: aktif },
          { value: 'terjawab', label: t('doa.filter_terjawab'), count: terjawab },
        ]}
      />
      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        filter === 'aktif' ? (
          <View className="items-center py-14 px-6">
            <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <HandHeart size={26} color="#EA580C" />
            </View>
            <Text className="text-base font-bold text-neutral-900 text-center">{t('doa.empty_title')}</Text>
            <Text className="text-sm text-neutral-500 text-center mt-1 mb-5">{t('doa.empty_body')}</Text>
            <Button label={t('doa.new')} onPress={() => router.push('/doa/form' as never)} />
          </View>
        ) : (
          <Text className="text-sm text-neutral-400 text-center py-14">{t('doa.empty_terjawab')}</Text>
        )
      ) : (
        <>
          {rows.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/doa/${p.id}` as never)}
              onLongPress={() => confirmDelete(p)}
              className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
            >
              <View className="flex-1 min-w-0 gap-1">
                <View className="flex-row items-center gap-2">
                  <Chip label={t(`doa.kategori_${p.kategori}`)} muted />
                  <View className="flex-1" />
                  <PrayerStatusBadge status={p.displayStatus} />
                </View>
                <Text className="text-sm text-neutral-800" numberOfLines={2}>
                  {p.isi}
                </Text>
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <Text className="text-[11px] text-neutral-400">
                    {t('doa.for')}: {untukLabel(t, p.untuk, p.untukNama)} · {fmtDate(p.createdAt, i18n.language)}
                  </Text>
                  {p.isAnonim ? <EyeOff size={11} color={nc('#A3A3A3')} /> : null}
                </View>
              </View>
              <ChevronRight size={16} color={nc('#A3A3A3')} />
            </Pressable>
          ))}
          <View className="mt-2">
            <Button label={t('doa.new')} onPress={() => router.push('/doa/form' as never)} leftIcon={<Plus size={18} color="#fff" />} />
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
  const [filter, setFilter] = useState<'pending' | 'done'>('pending');
  const q = useQuery({ queryKey: ['prayer', 'assigned', filter], queryFn: () => listAssignedPrayers(filter) });
  const rows: AssignedPrayer[] = q.data ?? [];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => {
            q.refetch();
            qc.invalidateQueries({ queryKey: ['prayer', 'summary'] });
          }}
          tintColor="#F97316"
        />
      }
    >
      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: t('doa.filter_pending') },
          { value: 'done', label: t('doa.filter_done') },
        ]}
      />
      {q.isPending ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <Text className="text-sm text-neutral-400 text-center py-14">
          {filter === 'pending' ? t('doa.empty_assigned') : t('doa.empty_assigned_done')}
        </Text>
      ) : (
        rows.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/doa/assigned/${p.id}` as never)}
            className="bg-card rounded-2xl p-4 border border-neutral-100 gap-1.5"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-neutral-900 flex-1" numberOfLines={1}>
                {p.pengirim?.namaLengkap ?? t('doa.anonim')}
              </Text>
              <Chip label={t(`doa.kategori_${p.kategori}`)} muted />
            </View>
            <Text className="text-sm text-neutral-800" numberOfLines={3}>
              {p.isi}
            </Text>
            <Text className="text-[11px] text-neutral-400">
              {[`${t('doa.for')}: ${untukLabel(t, p.untuk, p.untukNama)}`, p.cabang?.nama, fmtDate(p.assignedAt ?? p.createdAt, i18n.language)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {filter === 'pending' ? (
              <View className="mt-1 border border-brand-500 rounded-xl py-2 items-center">
                <Text className="text-sm font-semibold text-brand-600">{t('doa.mark_prayed')}</Text>
              </View>
            ) : (
              <View className="flex-row mt-0.5">
                <PrayerStatusBadge status={p.displayStatus} />
              </View>
            )}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
