/** Komponen kecil bersama untuk layar Doa (prayer request). */
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Circle } from 'lucide-react-native';

import type { PrayerDisplayStatus, PrayerTarget } from '@/api/prayer';

const STATUS_CLS: Record<PrayerDisplayStatus, { bg: string; text: string }> = {
  BARU: { bg: 'bg-amber-100', text: 'text-amber-800' },
  DITUGASKAN: { bg: 'bg-amber-100', text: 'text-amber-800' },
  SUDAH_DIDOAKAN: { bg: 'bg-sky-100', text: 'text-sky-800' },
  TERJAWAB: { bg: 'bg-green-100', text: 'text-green-800' },
};

export function PrayerStatusBadge({ status }: { status: PrayerDisplayStatus }) {
  const { t } = useTranslation();
  const c = STATUS_CLS[status];
  return (
    <View className={`px-2 py-0.5 rounded-full ${c.bg}`}>
      <Text className={`text-[10px] font-bold ${c.text}`}>{t(`doa.status_${status}`)}</Text>
    </View>
  );
}

export function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${muted ? 'bg-neutral-100' : 'bg-brand-50'}`}>
      <Text className={`text-[11px] font-medium ${muted ? 'text-neutral-600' : 'text-brand-700'}`}>{label}</Text>
    </View>
  );
}

/** Pilihan pill (single select). */
export function PillOption({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-300'}`}
    >
      <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{label}</Text>
    </Pressable>
  );
}

/** Tab filter dengan jumlah. */
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => (
        <PillOption
          key={o.value}
          on={value === o.value}
          onPress={() => onChange(o.value)}
          label={o.count !== undefined ? `${o.label} (${o.count})` : o.label}
        />
      ))}
    </View>
  );
}

export function untukLabel(t: (k: string) => string, untuk: PrayerTarget, nama: string | null) {
  const base = t(`doa.untuk_${untuk}`);
  return untuk !== 'DIRI_SENDIRI' && nama ? `${base} (${nama})` : base;
}

export const fmtDate = (iso: string, lang: string, withTime = false) =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export function TimelineStep({ done, label, sub }: { done: boolean; label: string; sub?: string | null }) {
  return (
    <View className="flex-row items-start gap-2">
      {done ? <CircleCheck size={16} color="#16A34A" /> : <Circle size={16} color="#D4D4D4" />}
      <View className="flex-1">
        <Text className={`text-sm ${done ? 'text-neutral-800' : 'text-neutral-400'}`}>{label}</Text>
        {sub ? <Text className="text-[11px] text-neutral-400">{sub}</Text> : null}
      </View>
    </View>
  );
}
