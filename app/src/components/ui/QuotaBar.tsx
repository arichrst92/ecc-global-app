/**
 * Baris kuota ringkas: [ikon] ▓▓▓▓░░░░ 84/200 — angka sejajar dengan progress bar.
 * Dipakai kartu event (Beranda, daftar Event), detail event, dan okupansi ibadah.
 * Sebelum check-in dibuka ikon "terdaftar" (Users), sesudahnya "hadir" (UserCheck);
 * kalimat lengkap tetap dibacakan pembaca layar (accessibilityLabel).
 */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { UserCheck, Users } from 'lucide-react-native';

import { nc } from '@/theme/ThemeRoot';

export function QuotaBar({
  count,
  total,
  attending,
  label,
  barClass,
  barColor,
  icon,
  size = 'sm',
  className = '',
}: {
  count: number;
  total: number;
  /** true = jumlah hadir (ikon centang), false = terdaftar / reservasi. */
  attending?: boolean;
  /** Kalimat lengkap untuk pembaca layar, mis. "84 terdaftar dari 200". */
  label: string;
  /** Kelas warna bar (mis. 'bg-brand-500'); atau pakai barColor. */
  barClass?: string;
  barColor?: string;
  /** Ganti ikon bawaan (mis. kursi untuk okupansi ibadah). */
  icon?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (count / total) * 100)) : 0;
  const nf = (n: number) => n.toLocaleString('id-ID');
  const h = size === 'md' ? 'h-2' : 'h-1.5';
  const iconColor = nc('#737373');
  return (
    <View className={`flex-row items-center gap-2 ${className}`} accessible accessibilityLabel={label}>
      {icon !== undefined ? icon : attending ? <UserCheck size={13} color={iconColor} /> : <Users size={13} color={iconColor} />}
      <View className={`flex-1 ${h} bg-neutral-100 rounded-full overflow-hidden`}>
        <View
          className={`h-full rounded-full ${barColor ? '' : (barClass ?? 'bg-brand-500')}`}
          style={{ width: `${pct}%`, ...(barColor ? { backgroundColor: barColor } : null) }}
        />
      </View>
      <Text
        className={`${size === 'md' ? 'text-sm' : 'text-xs'} font-semibold text-neutral-700`}
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {nf(count)}/{nf(total)}
      </Text>
    </View>
  );
}
