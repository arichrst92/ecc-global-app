/**
 * MaintenanceModal — full-screen blocking modal saat maintenance mode aktif.
 * Per BE handoff 2026-05-23.
 *
 * TIDAK ada tombol close/dismiss — modal benar-benar blocking. Yang ada:
 * - Countdown (kalau estimatedEndAt set)
 * - "Coba lagi" button → manual refetch (optimistic — kalau BE return
 *   isEnabled=false, parent will unmount this component)
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Wrench } from 'lucide-react-native';

import type { MaintenanceStatus } from '@/types/maintenance';

type Props = {
  data: MaintenanceStatus;
  onRetry: () => void;
};

function formatRemaining(ms: number): { h: number; m: number; s: number } | null {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

export function MaintenanceModal({ data, onRetry }: Props) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() =>
    data.estimatedEndAt
      ? formatRemaining(new Date(data.estimatedEndAt).getTime() - Date.now())
      : null,
  );

  // Live countdown setiap 1 detik kalau estimatedEndAt set
  useEffect(() => {
    if (!data.estimatedEndAt) return;
    const end = new Date(data.estimatedEndAt).getTime();
    const tick = () => setRemaining(formatRemaining(end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.estimatedEndAt]);

  return (
    <View className="flex-1 bg-amber-50">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 items-center justify-center px-8">
        <View className="w-24 h-24 rounded-3xl bg-amber-100 items-center justify-center mb-6">
          <Wrench size={48} color="#D97706" />
        </View>

        <Text className="text-2xl font-bold text-amber-900 text-center">
          {t('maintenance.title')}
        </Text>

        <Text className="text-sm text-amber-800 text-center mt-2 leading-relaxed">
          {data.message ?? t('maintenance.default_message')}
        </Text>

        {remaining ? (
          <View className="mt-6 bg-white rounded-2xl px-5 py-4 border border-amber-200 items-center">
            <Text className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
              {t('maintenance.countdown_label')}
            </Text>
            <View className="flex-row items-baseline gap-2">
              {remaining.h > 0 ? (
                <View className="items-center">
                  <Text className="text-3xl font-bold text-amber-900 tabular-nums">
                    {String(remaining.h).padStart(2, '0')}
                  </Text>
                  <Text className="text-[10px] text-amber-700">jam</Text>
                </View>
              ) : null}
              <View className="items-center">
                <Text className="text-3xl font-bold text-amber-900 tabular-nums">
                  {String(remaining.m).padStart(2, '0')}
                </Text>
                <Text className="text-[10px] text-amber-700">menit</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-amber-900 tabular-nums">
                  {String(remaining.s).padStart(2, '0')}
                </Text>
                <Text className="text-[10px] text-amber-700">detik</Text>
              </View>
            </View>
          </View>
        ) : data.estimatedEndAt ? null : (
          <View className="mt-6 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#D97706" />
            <Text className="text-xs text-amber-700">{t('maintenance.no_estimate')}</Text>
          </View>
        )}

        <Pressable
          onPress={onRetry}
          className="mt-8 bg-amber-500 rounded-full px-6 py-3 flex-row items-center gap-2"
        >
          <RefreshCw size={16} color="#fff" />
          <Text className="text-sm font-bold text-white">{t('maintenance.retry_btn')}</Text>
        </Pressable>

        <Text className="text-[10px] text-amber-600 text-center mt-6 leading-relaxed">
          {t('maintenance.auto_recover_hint')}
        </Text>
      </SafeAreaView>
    </View>
  );
}
