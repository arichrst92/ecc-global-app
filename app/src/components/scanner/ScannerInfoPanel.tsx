/**
 * Info untuk petugas di layar scan (di bawah judul):
 *  - jam & lokasi ibadah/event (jam dinding cabang + "Waktu <kota>")
 *  - status jendela scan: belum dibuka / dibuka s.d. HH:mm / terlambat → walk-in
 *  - ringkasan: hadir · belum hadir · tamu walk-in · self check-in · discan saya
 * Ketuk ringkasan → daftar (tab sesuai angka yang diketuk).
 * Default TERLIPAT (satu baris status + ringkasan) supaya tidak menutupi
 * bingkai kamera di HP kecil; ketuk baris atas untuk membuka detail.
 * Server lama tidak mengirim info ini → panel tidak tampil.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react-native';

import type { ScanWindowInfo } from '@/types/scanner';
import type { ScanListTab } from '@/components/scanner/ScanListModal';
import { cabangCity, zoneTimeText } from '@/utils/time';

export function ScannerInfoPanel({
  info,
  window: w,
  counts,
  onOpenList,
  showWindow = true,
}: {
  info?: {
    jamMulai: string | null;
    jamSelesai: string | null;
    lokasi: string | null;
    cabangNama: string | null;
    cabangKota?: string | null;
    timezone: string | null;
  } | null;
  window?: ScanWindowInfo | null;
  counts: Array<{
    key: string;
    label: string;
    value: number | undefined;
    tab: ScanListTab;
    tone?: 'green' | 'amber' | 'violet' | 'sky' | 'neutral';
  }>;
  onOpenList: (tab: ScanListTab) => void;
  /** Mode checkout / jemput tidak dibatasi jendela scan. */
  showWindow?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const shown = counts.filter((c) => c.value != null);
  const time =
    info?.jamMulai && info.jamMulai !== '-'
      ? zoneTimeText(
          info.jamMulai,
          info.jamSelesai,
          info.timezone,
          i18n.language,
          info.cabangKota || cabangCity(info.cabangNama),
        )
      : '';
  if (!time && !info?.lokasi && !w && shown.length === 0) return null;

  const win = showWindow && w ? windowView(w, t) : null;
  const Chevron = open ? ChevronUp : ChevronDown;

  if (!open) {
    // Terlipat: status scan (atau jam) + angka ringkas dalam satu baris.
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={t('scanner.info_expand')}
        className="mx-4 mt-1 bg-black/55 rounded-full pl-2 pr-3 py-1.5 flex-row items-center gap-2 active:opacity-80"
      >
        {win ? (
          <View className={`w-2.5 h-2.5 rounded-full ${win.dot}`} />
        ) : (
          <Clock size={12} color="#d4d4d4" />
        )}
        <Text className="text-white text-[11px] font-semibold flex-1" numberOfLines={1}>
          {win ? win.title : time}
          {shown.length
            ? `  ·  ${shown
                .slice(0, 2)
                .map((c) => `${c.value} ${c.label}`)
                .join(' · ')}`
            : ''}
        </Text>
        <Chevron size={14} color="#fff" />
      </Pressable>
    );
  }

  return (
    <View className="mx-4 mt-1 bg-black/55 rounded-2xl px-3 py-2.5">
      <Pressable
        onPress={() => setOpen(false)}
        hitSlop={6}
        className="absolute right-2 top-2 z-10 p-1"
      >
        <Chevron size={14} color="#fff" />
      </Pressable>
      {time ? (
        <View className="flex-row items-center gap-1.5">
          <Clock size={12} color="#d4d4d4" />
          <Text className="text-white/90 text-[11px] flex-1 pr-5" numberOfLines={1}>
            {time}
          </Text>
        </View>
      ) : null}
      {info?.lokasi ? (
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <MapPin size={12} color="#d4d4d4" />
          <Text className="text-white/80 text-[11px] flex-1" numberOfLines={1}>
            {info.lokasi}
          </Text>
        </View>
      ) : null}
      {win ? (
        <View className={`mt-2 rounded-xl px-2.5 py-1.5 ${win.bg}`}>
          <Text className="text-white text-[11px] font-bold">{win.title}</Text>
          {win.sub ? (
            <Text className="text-white/90 text-[10px] mt-0.5 leading-snug">{win.sub}</Text>
          ) : null}
        </View>
      ) : null}
      {shown.length ? (
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          {shown.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => onOpenList(c.tab)}
              className={`rounded-full px-2.5 py-1 flex-row items-center gap-1 active:opacity-70 ${TONE[c.tone ?? 'neutral']}`}
            >
              <Text className="text-white text-[11px] font-bold">{c.value}</Text>
              <Text className="text-white/90 text-[11px]">{c.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const TONE = {
  green: 'bg-emerald-600/80',
  amber: 'bg-amber-600/80',
  violet: 'bg-violet-600/80',
  sky: 'bg-sky-600/80',
  neutral: 'bg-white/15',
} as const;

function windowView(w: ScanWindowInfo, t: (k: string, o?: Record<string, unknown>) => string) {
  const o = { open: w.opensJam, close: w.closesJam, zona: w.zona };
  switch (w.phase) {
    case 'OPEN':
      return {
        dot: 'bg-emerald-400',
        bg: 'bg-emerald-600/80',
        title: t('scanner.win_open', o),
        sub: t('scanner.win_open_sub', o),
      };
    case 'TOO_EARLY':
      return {
        dot: 'bg-amber-400',
        bg: 'bg-amber-600/80',
        title: t('scanner.win_early', o),
        sub: w.message,
      };
    case 'LATE':
      return {
        dot: 'bg-violet-400',
        bg: 'bg-violet-600/80',
        title: t('scanner.win_late'),
        sub: t('scanner.win_late_sub', o),
      };
    default:
      return {
        dot: 'bg-red-400',
        bg: 'bg-red-600/80',
        title: t('scanner.win_closed'),
        sub: w.message,
      };
  }
}
