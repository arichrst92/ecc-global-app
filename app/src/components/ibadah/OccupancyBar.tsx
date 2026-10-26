/**
 * Progress bar okupansi seat ibadah (hadir ÷ jumlah seat).
 * Hanya pendataan — check-in tidak dibatasi, jadi bisa > 100%:
 * bar tetap penuh (tidak keluar kartu), warna merah, + label "+N di atas seat".
 * Tidak tampil kalau seat belum diisi admin.
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Armchair } from 'lucide-react-native';

import type { IbadahOkupansi } from '@/types/ibadah';
import { nc } from '@/theme/ThemeRoot';

export function OccupancyBar({ data, compact = false }: { data: IbadahOkupansi | null | undefined; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  if (!data || !data.seat || data.persen == null) return null;
  const nf = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'id-ID', { maximumFractionDigits: 1 });
  const pct = data.persen;
  const over = data.hadir > data.seat;
  const color = over ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  const width = `${Math.max(0, Math.min(100, pct))}%` as const;

  const bar = (
    <View className="h-2 bg-neutral-100 rounded-full overflow-hidden">
      <View style={{ width, backgroundColor: color }} className="h-full rounded-full" />
    </View>
  );

  if (compact) {
    return (
      <View className="mt-3">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-1.5 flex-shrink">
            <Armchair size={13} color={nc('#737373')} />
            <Text className="text-xs text-neutral-500" numberOfLines={1}>
              {t('ibadah.occupancy_count', { hadir: nf(data.hadir), seat: nf(data.seat) })}
            </Text>
          </View>
          <Text className="text-xs font-bold ml-2" style={{ color: over ? '#DC2626' : nc('#404040') }}>
            {nf(pct)}%
          </Text>
        </View>
        {bar}
        {over ? (
          <Text className="text-[11px] text-red-600 mt-1">{t('ibadah.occupancy_over', { count: data.hadir - data.seat })}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="bg-card rounded-2xl p-4 border border-neutral-100 mb-3">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
          <Armchair size={18} color="#059669" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-xs text-neutral-500">{t('ibadah.occupancy')}</Text>
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {t('ibadah.occupancy_count', { hadir: nf(data.hadir), seat: nf(data.seat) })}
          </Text>
        </View>
        <Text className="text-lg font-bold" style={{ color: over ? '#DC2626' : nc('#171717') }}>
          {nf(pct)}%
        </Text>
      </View>
      {bar}
      {over ? (
        <Text className="text-xs text-red-600 mt-2">{t('ibadah.occupancy_over', { count: data.hadir - data.seat })}</Text>
      ) : null}
    </View>
  );
}
