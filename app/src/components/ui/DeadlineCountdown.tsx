/**
 * Countdown batas reservasi / pendaftaran — format ringkas DD:jj:mm:dd
 * (hari:jam:menit:detik, mis. "Tutup dalam 02:05:30:12"), jam server.
 *  - Ibadah: reservasi ditutup saat jam mulai → setelahnya self check-in
 *    (ibadah anak: check-in di meja CKids).
 *  - Event: pendaftaran online ditutup saat event mulai → walk-in di lokasi.
 * closesAt null/absen (server lama) → tidak tampil.
 */
import { useEffect, useState } from 'react';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Timer, TimerOff } from 'lucide-react-native';
import { serverNowMs } from '@/utils/serverClock';
import { nc } from '@/theme/ThemeRoot';

type Kind = 'ibadah' | 'kids' | 'event';

function useNowSecond() {
  const [now, setNow] = useState(() => serverNowMs());
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') setNow(serverNowMs());
    }, 1_000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setNow(serverNowMs());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}


export function DeadlineCountdown({
  closesAt,
  kind,
  compact = false,
  short = false,
  className,
}: {
  closesAt: string | null | undefined;
  kind: Kind;
  compact?: boolean;
  /** Kartu sempit (Beranda): saat ditutup cukup satu baris singkat, tanpa kalimat panjang. */
  short?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const now = useNowSecond();
  const { width } = useWindowDimensions();
  if (!closesAt) return null;
  const end = new Date(closesAt).getTime();
  if (!Number.isFinite(end)) return null;
  const left = end - now;

  if (left <= 0 && short && kind === 'event') {
    return (
      <View className={`flex-row items-center gap-1.5 ${className ?? ''}`}>
        <TimerOff size={12} color={nc('#737373')} />
        <Text className="flex-1 text-[11px] leading-4 text-neutral-500" numberOfLines={1}>
          {t('event.registration_closed_btn')}
        </Text>
      </View>
    );
  }
  if (left <= 0) {
    const msg = kind === 'event' ? t('deadline.event_closed') : kind === 'kids' ? t('deadline.kids_closed') : t('deadline.ibadah_closed');
    return (
      <View className={`flex-row items-start gap-1.5 ${compact ? '' : 'bg-neutral-100 rounded-xl px-3 py-2.5'} ${className ?? ''}`}>
        <TimerOff size={compact ? 12 : 14} color={nc('#737373')} style={{ marginTop: compact ? 1 : 2 }} />
        <Text className={`flex-1 ${compact ? 'text-[11px] leading-4' : 'text-xs leading-5'} text-neutral-600`}>{msg}</Text>
      </View>
    );
  }

  // DD:jj:mm:dd — ringkas & tidak memanjang di kartu sempit.
  const totalSec = Math.ceil(left / 1000);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const dd = Math.floor(totalSec / 86_400);
  const hh = Math.floor((totalSec % 86_400) / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const value = `${p2(dd)}:${p2(hh)}:${p2(mm)}:${p2(ss)}`;
  const urgent = left < 3 * 3_600_000; // < 3 jam
  const label = kind === 'event' ? t('deadline.event_label') : t('deadline.ibadah_label');
  const narrow = width < 360;

  if (compact) {
    // Kartu daftar: label pendek ("Tutup dalam") + teks boleh turun baris di
    // HP layar kecil (flex-1 → tidak meluber keluar kartu).
    return (
      <View className={`flex-row items-start gap-1.5 ${className ?? ''}`}>
        <Timer size={12} color={urgent ? '#DC2626' : nc('#737373')} style={{ marginTop: 1 }} />
        <Text className={`flex-1 text-[11px] leading-4 ${urgent ? 'text-red-600' : 'text-neutral-500'}`} numberOfLines={1}>
          {t('deadline.closes_in')}{' '}
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
        {/* Bisa turun baris di HP layar kecil; ukuran sedikit lebih kecil di bawah 360 pt. */}
        <Text
          className={`${narrow ? 'text-sm' : 'text-base'} font-bold mt-0.5 ${urgent ? 'text-red-600' : 'text-brand-700'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
