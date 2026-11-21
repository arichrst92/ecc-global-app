/**
 * "Self check-in akan tersedia dalam hh:mm:ss" — hitung mundur ke opensAt
 * memakai jam server (bukan jam HP). Saat mencapai 0 → onDone() supaya
 * layar menampilkan tombol Self Check-in.
 */
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react-native';

import { serverNowMs } from '@/utils/serverClock';
import { localTime, SELF_CHECKIN_GRACE_MS } from '@/utils/time';

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
        <Text className="text-[11px] text-brand-700/70">{t('ibadah.self_checkin_opens_at', { time: localTime(opensAt) })}</Text>
      </View>
      <Text className="text-xl font-bold text-brand-700" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCountdown(left)}
      </Text>
    </View>
  );
}

/**
 * "Self check-in akan berakhir dalam mm:ss" — hanya tampil setelah ibadah
 * selesai (masa tenggang SELF_CHECKIN_GRACE_MS sebelum closesAt). Saat 0 →
 * onDone() supaya layar langsung menyembunyikan self check-in.
 */
export function SelfCheckinEndsCountdown({
  closesAt,
  onDone,
  className = 'mb-3',
  compact = false,
}: {
  closesAt: string;
  onDone?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const target = Date.parse(closesAt);
  const [left, setLeft] = useState(() => target - serverNowMs());
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const ms = target - serverNowMs();
      setLeft(ms);
      if (ms <= 0 && !doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Belum masuk masa setelah ibadah selesai, atau sudah lewat → tidak tampil.
  if (!Number.isFinite(target) || left <= 0 || left > SELF_CHECKIN_GRACE_MS) return null;
  const total = Math.ceil(left / 1000);
  const mmss = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  return (
    <View
      className={`flex-row items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
    >
      <Timer size={compact ? 16 : 20} color="#B45309" />
      <Text className={`flex-1 text-amber-800 ${compact ? 'text-[11px]' : 'text-xs'}`}>{t('ibadah.self_checkin_ends_in')}</Text>
      <Text className={`font-bold text-amber-700 ${compact ? 'text-base' : 'text-xl'}`} style={{ fontVariant: ['tabular-nums'] }}>
        {mmss}
      </Text>
    </View>
  );
}
