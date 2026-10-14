/**
 * "Self check-in akan tersedia dalam hh:mm:ss" — hitung mundur ke opensAt
 * memakai jam server (bukan jam HP). Saat mencapai 0 → onDone() supaya
 * layar menampilkan tombol Self Check-in.
 */
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react-native';

import { serverNowMs, wibTime } from '@/utils/serverClock';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function SelfCheckinCountdown({
  opensAt,
  onDone,
  className = 'mb-3',
}: {
  opensAt: string;
  onDone: () => void;
  /** Margin luar (default mb-3). */
  className?: string;
}) {
  const { t } = useTranslation();
  const target = Date.parse(opensAt);
  const [left, setLeft] = useState(() => target - serverNowMs());
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const ms = target - serverNowMs();
      setLeft(ms);
      if (ms <= 0 && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (left <= 0) return null;
  return (
    <View className={`flex-row items-center gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 ${className}`}>
      <Timer size={20} color="#EA580C" />
      <View className="flex-1">
        <Text className="text-xs text-brand-800">{t('ibadah.self_checkin_countdown')}</Text>
        <Text className="text-[11px] text-brand-700/70">{t('ibadah.self_checkin_opens_at', { time: wibTime(opensAt) })}</Text>
      </View>
      <Text className="text-xl font-bold text-brand-700" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCountdown(left)}
      </Text>
    </View>
  );
}
