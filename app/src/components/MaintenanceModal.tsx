/**
 * MaintenanceModal — layar penuh yang memblokir app saat maintenance aktif.
 *
 * TIDAK bisa ditutup. Isi:
 * - Header oranye brand dengan logo Els App.
 * - Pesan dari Portal sesuai bahasa app (English → messageEn; kosong →
 *   teks bawaan English, bukan pesan Indonesia).
 * - Hitung mundur + jam perkiraan selesai (zona waktu HP) bila estimasi diisi.
 *   Saat hitungan habis → "Hampir selesai…" dan app memeriksa otomatis (server
 *   menganggap maintenance selesai begitu estimasi lewat).
 * - Tombol "Coba lagi" dengan status sedang memeriksa.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Clock, RefreshCw, Wrench } from 'lucide-react-native';

import type { MaintenanceStatus } from '@/types/maintenance';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { deviceTz, tzZoneLabel } from '@/utils/time';
import { AppLogo, isEnglish } from '@/components/update/shared';

type Props = {
  data: MaintenanceStatus;
  onRetry: () => unknown;
  checking?: boolean;
};

function splitRemaining(ms: number): { h: number; m: number; s: number } | null {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return { h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Jam selesai di zona HP: "14.30 Waktu Jakarta" / "14:30 Jakarta time" (+ tanggal bila bukan hari ini). */
function endLabel(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const en = isEnglish(lang);
  const time = `${pad(d.getHours())}${en ? ':' : '.'}${pad(d.getMinutes())}`;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tz = deviceTz();
  const zone = tz ? ` ${tzZoneLabel(tz, lang)}` : '';
  if (sameDay) return `${time}${zone}`;
  const MONTHS = en
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}${zone}`;
}

export function MaintenanceModal({ data, onRetry, checking = false }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const endMs = data.estimatedEndAt ? new Date(data.estimatedEndAt).getTime() : null;
  const [remaining, setRemaining] = useState(() => (endMs ? splitRemaining(endMs - Date.now()) : null));

  useEffect(() => {
    if (!endMs) return;
    const tick = () => setRemaining(splitRemaining(endMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);

  // Hitungan habis → periksa sekali otomatis (server sudah menganggap selesai).
  const autoChecked = useRef(false);
  const finished = !!endMs && !remaining;
  useEffect(() => {
    if (finished && !autoChecked.current) {
      autoChecked.current = true;
      void onRetry();
    }
  }, [finished, onRetry]);

  const en = isEnglish(lang);
  const serverMsg = en ? data.messageEn : data.message;
  const message = serverMsg?.trim() ? serverMsg.trim() : t('maintenance.default_message');

  const units: Array<{ v: number; label: string }> = remaining
    ? [
        ...(remaining.h > 0 ? [{ v: remaining.h, label: t('maintenance.unit_hours') }] : []),
        { v: remaining.m, label: t('maintenance.unit_minutes') },
        { v: remaining.s, label: t('maintenance.unit_seconds') },
      ]
    : [];

  return (
    <View className="flex-1 bg-card">
      <StatusBar style="light" />
      {/* Header oranye + logo */}
      <View {...gx('bg-brand-500 rounded-b-3xl')}>
        <SafeAreaView edges={['top']}>
          <View className="items-center px-8 pt-10 pb-8 w-full max-w-md self-center">
            <AppLogo size={84} />
            <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mt-5">
              <Wrench size={12} color="#fff" />
              <Text className="text-white text-xs font-semibold">{t('maintenance.badge')}</Text>
            </View>
            <Text className="text-white text-2xl font-bold text-center mt-3">{t('maintenance.title')}</Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="flex-1 w-full max-w-md self-center">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        >
          <Text className="text-base text-neutral-700 text-center leading-relaxed">{message.replace(/\*\*/g, '')}</Text>

          {/* Estimasi */}
          <View className="mt-6 bg-neutral-50 border border-neutral-100 rounded-2xl p-5 items-center">
            {remaining ? (
              <>
                <Text className="text-xs font-semibold text-brand-600 mb-3">{t('maintenance.countdown_label')}</Text>
                <View className="flex-row gap-2.5">
                  {units.map((u, i) => (
                    <View key={i} className="items-center bg-card rounded-xl border border-neutral-100 py-2.5" style={{ minWidth: 68 }}>
                      <Text className="text-3xl font-bold text-neutral-900" style={{ fontVariant: ['tabular-nums'] }}>
                        {pad(u.v)}
                      </Text>
                      <Text className="text-[11px] text-neutral-500 mt-0.5">{u.label}</Text>
                    </View>
                  ))}
                </View>
                {data.estimatedEndAt ? (
                  <View className="flex-row items-center gap-1.5 mt-3">
                    <Clock size={13} color={nc('#737373')} />
                    <Text className="text-xs text-neutral-500">
                      {t('maintenance.ends_at', { time: endLabel(data.estimatedEndAt, lang) })}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : finished ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#EA580C" />
                <Text className="text-sm text-neutral-700">{t('maintenance.almost_done')}</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#EA580C" />
                <Text className="text-sm text-neutral-700">{t('maintenance.no_estimate')}</Text>
              </View>
            )}
          </View>

          <Text className="text-xs text-neutral-500 text-center mt-5 leading-relaxed">
            {t('maintenance.auto_recover_hint')}
          </Text>
        </ScrollView>

        <SafeAreaView edges={['bottom']}>
          <View className="px-6 pt-3 pb-4">
            <Pressable
              onPress={() => void onRetry()}
              disabled={checking}
              accessibilityRole="button"
              {...gx(`bg-brand-500 py-4 rounded-2xl flex-row items-center justify-center gap-2 w-full ${checking ? 'opacity-80' : ''}`)}
            >
              {checking ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={18} color="#fff" />}
              <Text className="text-white font-bold text-base">
                {checking ? t('maintenance.checking') : t('maintenance.retry_btn')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
