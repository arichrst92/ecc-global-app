/**
 * Kartu ringkas Spiritual Journey di Profil: progres + tahap berikutnya.
 * Tidak tampil kalau belum ada tahap yang diatur gereja.
 */
import { Pressable, Text, View } from 'react-native';
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
  if (!d || d.total === 0) return null;
  const next = d.nextIndex != null ? d.steps[d.nextIndex] : null;
  const pct = Math.round((d.achievedCount / d.total) * 100);

  return (
    <Pressable
      onPress={() => router.push('/spiritual-journey' as never)}
      className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
          <Footprints size={18} color="#059669" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-neutral-900">{t('journey.title')}</Text>
          <Text className="text-xs text-neutral-500" numberOfLines={1}>
            {next
              ? t('journey.next_short', { title: next.judul })
              : t('journey.all_done')}
          </Text>
        </View>
        <Text className="text-xs font-semibold text-emerald-700">
          {d.achievedCount}/{d.total}
        </Text>
        <ChevronRight size={16} color="#A3A3A3" />
      </View>
      <View className="h-2 bg-neutral-100 rounded-full mt-3 overflow-hidden">
        <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
      </View>
    </Pressable>
  );
}
