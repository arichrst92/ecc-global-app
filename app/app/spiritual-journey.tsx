/**
 * Spiritual Journey — tahap berurutan (diatur gereja di portal).
 * Tiap tahap: sudah / berikutnya / belum, syarat (role › sub role › status),
 * cara mendapatkan, dan event mendatang yang memberi status tahap tersebut.
 */
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Footprints, Lock } from 'lucide-react-native';

import { getMyJourney, type JourneyStep } from '@/api/spiritualJourney';
import { MY_JOURNEY_KEY } from '@/components/spiritual/JourneyCard';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatDateWithDay } from '@/utils/date';

export default function SpiritualJourneyScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const q = useQuery({ queryKey: MY_JOURNEY_KEY, queryFn: getMyJourney });
  useRefetchOnFocus(() => q.refetch());
  const d = q.data;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('journey.title')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : q.isError || !d ? (
          <View className="py-16 items-center">
            <Text className="text-sm text-red-600 mb-2">{t('error.generic')}</Text>
            <Pressable onPress={() => q.refetch()}>
              <Text className="text-sm font-bold text-brand-600">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : d.total === 0 ? (
          <View className="py-16 items-center px-8">
            <Footprints size={32} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 text-center mt-3">{t('journey.empty')}</Text>
          </View>
        ) : (
          <>
            <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5">
              <Text className="text-sm font-bold text-emerald-900">
                {t('journey.progress', { done: d.achievedCount, total: d.total })}
              </Text>
              <View className="h-2 bg-white rounded-full mt-2 overflow-hidden">
                <View
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.round((d.achievedCount / d.total) * 100)}%` }}
                />
              </View>
              <Text className="text-xs text-emerald-800 mt-2">
                {d.nextIndex != null ? t('journey.next_short', { title: d.steps[d.nextIndex]!.judul }) : t('journey.all_done')}
              </Text>
            </View>

            {d.steps.map((s, i) => (
              <StepItem key={s.id} step={s} last={i === d.steps.length - 1} onEvent={(id) => router.push(`/event/${id}` as never)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StepItem({ step: s, last, onEvent }: { step: JourneyStep; last: boolean; onEvent: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const dot = s.achieved
    ? 'bg-emerald-500 border-emerald-500'
    : s.isNext
      ? 'bg-brand-500 border-brand-500'
      : 'bg-white border-neutral-300';
  const syarat = [s.syarat.role, s.syarat.subRole, s.syarat.status].filter(Boolean).join(' › ');

  return (
    <View className="flex-row gap-3">
      {/* Garis timeline */}
      <View className="items-center" style={{ width: 32 }}>
        <View className={`w-8 h-8 rounded-full border-2 items-center justify-center ${dot}`}>
          {s.achieved ? (
            <Check size={16} color="#fff" />
          ) : s.ikon ? (
            <Text className="text-sm">{s.ikon}</Text>
          ) : s.isNext ? (
            <Text className="text-xs font-bold text-white">{s.urutan}</Text>
          ) : (
            <Lock size={13} color="#A3A3A3" />
          )}
        </View>
        {!last ? <View className={`w-0.5 flex-1 ${s.achieved ? 'bg-emerald-300' : 'bg-neutral-200'}`} /> : null}
      </View>

      <View
        className={`flex-1 mb-4 rounded-2xl p-4 border ${
          s.isNext ? 'bg-white border-brand-200' : s.achieved ? 'bg-white border-emerald-100' : 'bg-white border-neutral-100'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-[11px] text-neutral-400 font-semibold">{t('journey.step_n', { n: s.urutan })}</Text>
          <View
            className={`px-2 py-0.5 rounded-full ${
              s.achieved ? 'bg-emerald-100' : s.isNext ? 'bg-brand-100' : 'bg-neutral-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                s.achieved ? 'text-emerald-700' : s.isNext ? 'text-brand-700' : 'text-neutral-500'
              }`}
            >
              {s.achieved ? t('journey.status_done') : s.isNext ? t('journey.status_next') : t('journey.status_todo')}
            </Text>
          </View>
        </View>
        <Text className="text-base font-bold text-neutral-900 mt-1">{s.judul}</Text>
        {s.deskripsi ? <Text className="text-sm text-neutral-600 mt-1">{s.deskripsi}</Text> : null}
        <Text className="text-[11px] text-neutral-500 mt-2">
          {t('journey.requirement')}: <Text className="font-semibold text-neutral-700">{syarat}</Text>
        </Text>

        {!s.achieved && s.caraMendapatkan ? (
          <View className="mt-3 bg-neutral-50 rounded-xl p-3">
            <Text className="text-xs font-bold text-neutral-700 mb-1">{t('journey.how')}</Text>
            <Text className="text-xs text-neutral-700 leading-5">{s.caraMendapatkan}</Text>
          </View>
        ) : null}

        {!s.achieved && s.events.length > 0 ? (
          <View className="mt-3 gap-2">
            <Text className="text-xs font-bold text-neutral-700">{t('journey.events')}</Text>
            {s.events.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => onEvent(e.id)}
                className="flex-row items-center gap-2 p-2.5 rounded-xl border border-neutral-200 active:bg-neutral-50"
              >
                <CalendarDays size={16} color="#EA580C" />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {e.judul}
                  </Text>
                  <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                    {formatDateWithDay(e.tanggalMulai, i18n.language)}
                    {e.cabang?.nama ? ` · ${e.cabang.nama}` : ''}
                  </Text>
                </View>
                <ChevronRight size={14} color="#A3A3A3" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
