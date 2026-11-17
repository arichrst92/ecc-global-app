/**
 * Countdown batas reservasi / pendaftaran ("2 hari 5 jam 30 menit" /
 * "2 days 5 hours 30 minutes") — jam server. Satuan depan yang 0 tidak ditulis.
 *  - Ibadah: reservasi ditutup saat jam mulai → setelahnya self check-in
 *    (ibadah anak: check-in di meja CKids).
 *  - Event: pendaftaran online ditutup saat event mulai → walk-in di lokasi.
 * closesAt null/absen (server lama) → tidak tampil.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timer, TimerOff } from 'lucide-react-native';
import { serverNowMs } from '@/utils/serverClock';
import { nc } from '@/theme/ThemeRoot';

type Kind = 'ibadah' | 'kids' | 'event';

function useNowMinute() {
  const [now, setNow] = useState(() => serverNowMs());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNowMs()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}


export function DeadlineCountdown({
  closesAt,
  kind,
  compact = false,
  className,
}: {
  closesAt: string | null | undefined;
  kind: Kind;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const now = useNowMinute();
  if (!closesAt) return null;
  const end = new Date(closesAt).getTime();
  if (!Number.isFinite(end)) return null;
  const left = end - now;

  if (left <= 0) {
    const msg = kind === 'event' ? t('deadline.event_closed') : kind === 'kids' ? t('deadline.kids_closed') : t('deadline.ibadah_closed');
    return (
      <View className={`flex-row items-start gap-1.5 ${compact ? '' : 'bg-neutral-100 rounded-xl px-3 py-2.5'} ${className ?? ''}`}>
        <TimerOff size={compact ? 12 : 14} color={nc('#737373')} style={{ marginTop: compact ? 1 : 2 }} />
        <Text className={`flex-1 ${compact ? 'text-[11px]' : 'text-xs'} text-neutral-600`}>{msg}</Text>
      </View>
    );
  }

  const totalMin = Math.ceil(left / 60_000);
  const dd = Math.floor(totalMin / 1440);
  const hh = Math.floor((totalMin % 1440) / 60);
  const mm = totalMin % 60;
  // Satuan depan yang 0 dilewati: "5 jam 30 menit", "30 menit".
  const parts: string[] = [];
  if (dd > 0) parts.push(t('deadline.days', { count: dd }));
  if (dd > 0 || hh > 0) parts.push(t('deadline.hours', { count: hh }));
  parts.push(t('deadline.minutes', { count: mm }));
  const value = parts.join(' ');
  const urgent = left < 3 * 3_600_000; // < 3 jam
  const label = kind === 'event' ? t('deadline.event_label') : t('deadline.ibadah_label');

  if (compact) {
    return (
      <View className={`flex-row items-center gap-1.5 ${className ?? ''}`}>
        <Timer size={12} color={urgent ? '#DC2626' : nc('#737373')} />
        <Text className={`text-[11px] ${urgent ? 'text-red-600' : 'text-neutral-500'}`}>
          {label}{' '}
          <Text className="font-bold" style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 border ${urgent ? 'bg-red-50 border-red-200' : 'bg-brand-50 border-brand-100'} ${className ?? ''}`}
    >
      <Timer size={18} color={urgent ? '#DC2626' : '#EA580C'} />
      <View className="flex-1">
        <Text className={`text-xs ${urgent ? 'text-red-700' : 'text-brand-800'}`}>{label}</Text>
        <Text
          className={`text-base font-bold mt-0.5 ${urgent ? 'text-red-600' : 'text-brand-700'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
