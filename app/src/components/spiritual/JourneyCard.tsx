/**
 * Section Spiritual Journey di Profil: progres + tahap berikutnya.
 * Selalu tampil (memuat / belum diatur / gagal muat tetap ada kartunya) —
 * tap membuka layar timeline.
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Footprints } from 'lucide-react-native';

import { getMyJourney } from '@/api/spiritualJourney';

export const MY_JOURNEY_KEY = ['me', 'spiritual-journey'] as const;

export function JourneyCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useQuery({ queryKey: MY_JOURNEY_KEY, queryFn: getMyJourney, staleTime: 5 * 60_000 });
  const d = q.data;
  const hasSteps = !!d && d.total > 0;
  const next = hasSteps && d.nextIndex != null ? d.steps[d.nextIndex] : null;
  const pct = hasSteps ? Math.round((d.achievedCount / d.total) * 100) : 0;

  const subtitle = q.isPending
    ? null
    : q.isError
      ? t('journey.card_tap')
      : !hasSteps
        ? t('journey.card_empty')
        : next
          ? t('journey.next_short', { title: next.judul })
          : t('journey.all_done');

  return (
    <View className="mb-4">
      <Pressable
        onPress={() => router.push('/spiritual-journey' as never)}
        className="bg-white rounded-2xl border border-neutral-100 p-4 active:opacity-80"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
            <Footprints size={18} color="#059669" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-bold text-neutral-900">
              {hasSteps ? t('journey.progress', { done: d.achievedCount, total: d.total }) : t('journey.title')}
            </Text>
            {q.isPending ? (
              <ActivityIndicator size="small" color="#A3A3A3" style={{ alignSelf: 'flex-start', marginTop: 2 }} />
            ) : (
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
          <ChevronRight size={16} color="#A3A3A3" />
        </View>
        {hasSteps ? (
          <View className="h-2 bg-neutral-100 rounded-full mt-3 overflow-hidden">
            <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
