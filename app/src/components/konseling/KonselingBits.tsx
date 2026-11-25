/** Konseling (2.5.1) — badge status, format waktu, input tanggal + jam. */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react-native';

import { TextInput } from '@/components/ui/ThemedTextInput';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import type { KonselingStatus } from '@/api/konseling';
import { nc } from '@/theme/ThemeRoot';

const BADGE: Record<KonselingStatus, { bg: string; fg: string }> = {
  BARU: { bg: 'bg-amber-50', fg: 'text-amber-700' },
  DITUGASKAN: { bg: 'bg-sky-50', fg: 'text-sky-700' },
  DIJADWALKAN: { bg: 'bg-violet-50', fg: 'text-violet-700' },
  SELESAI: { bg: 'bg-emerald-50', fg: 'text-emerald-700' },
  DIBATALKAN: { bg: 'bg-neutral-100', fg: 'text-neutral-500' },
};

export function KonselingStatusBadge({ status }: { status: KonselingStatus }) {
  const { t } = useTranslation();
  const c = BADGE[status];
  return (
    <View className={`px-2 py-0.5 rounded-full ${c.bg}`}>
      <Text className={`text-[11px] font-semibold ${c.fg}`}>{t(`konseling.status_${status}`)}</Text>
    </View>
  );
}

export const fmtWhen = (iso: string | null | undefined, lang: string) =>
  iso
    ? new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Tanggal (hari ini s.d. +180 hari) + jam "HH:MM" → ISO (null bila belum lengkap). */
export function DateTimeField({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const { t, i18n } = useTranslation();
  const init = value ? new Date(value) : null;
  const [date, setDate] = useState(init ? ymd(init) : '');
  const [time, setTime] = useState(init ? `${String(init.getHours()).padStart(2, '0')}:${String(init.getMinutes()).padStart(2, '0')}` : '');
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today.getTime() + 180 * 86_400_000);
  const emit = (ds: string, ts: string) => {
    const m = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(ts.trim());
    const base = parseYmd(ds);
    if (!base || !m) return onChange(null);
    base.setHours(Number(m[1]), Number(m[2]), 0, 0);
    onChange(base.toISOString());
  };
  const d = parseYmd(date);
  return (
    <View className="flex-row gap-2">
      <Pressable onPress={() => setOpen(true)} className="flex-[3] flex-row items-center gap-2 border border-neutral-200 rounded-xl px-3 py-3 bg-card">
        <Calendar size={15} color="#EA580C" />
        <Text className={`text-sm flex-1 ${d ? 'text-neutral-900' : 'text-neutral-400'}`} numberOfLines={1}>
          {d ? d.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : t('konseling.pick_date')}
        </Text>
      </Pressable>
      <View className="flex-[2] border border-neutral-200 rounded-xl px-3 bg-card justify-center">
        <TextInput
          value={time}
          onChangeText={(s) => {
            const clean = s.replace(/[^0-9:.]/g, '').slice(0, 5);
            setTime(clean);
            emit(date, clean);
          }}
          placeholder={t('konseling.time_ph')}
          placeholderTextColor={nc('#A3A3A3')}
          keyboardType="numbers-and-punctuation"
          className="py-3 text-sm text-neutral-900"
        />
      </View>
      {open ? (
        <DatePickerModal
          value={d ?? today}
          minimumDate={today}
          maximumDate={max}
          onChange={(nd) => {
            const s = ymd(nd);
            setDate(s);
            emit(s, time);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}
