/**
 * Layar setuju (ulang) S&K + Kebijakan Privasi — kepatuhan no. 2.
 *
 * Muncul di atas aplikasi bila server menyatakan jemaat belum menyetujui
 * versi dokumen yang sedang terbit (akun lama, atau dokumen diperbarui).
 * Disembunyikan sementara saat jemaat membuka /legal/* untuk membaca.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ShieldCheck } from 'lucide-react-native';

import { acceptConsent, buildConsentPayload, getConsentStatus } from '@/api/consent';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { ConsentChecklist, EMPTY_CONSENT, isConsentComplete, type ConsentValue } from './ConsentChecklist';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { parseLocalDate, toIsoDate } from '@/utils/date';
import { formatYmdLong } from '@/utils/time';

/** Umur penuh dari YYYY-MM-DD; null bila kosong. */
function ageOf(ymd: string | null | undefined): number | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export function ConsentGate() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const segments = useSegments() as string[];
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const jemaatId = useAuthStore((s) => s.user?.jemaatId);
  const needsOnboarding = useAuthStore((s) => s.user?.needsOnboarding === true);
  const logout = useAuthStore((s) => s.logout);
  const [value, setValue] = useState<ConsentValue>(EMPTY_CONSENT);
  const [error, setError] = useState<string>();
  // Koreksi tanggal lahir (data impor Shiftsoft bisa salah, mis. terbaca 11 th padahal 21 th).
  const [dob, setDob] = useState<string | null>(null);
  const [pickDob, setPickDob] = useState(false);
  const [showDobFix, setShowDobFix] = useState(false);

  const enabled = isAuthenticated && !isGuest && !!jemaatId && !needsOnboarding;
  const q = useQuery({
    queryKey: ['consent-status', jemaatId],
    queryFn: getConsentStatus,
    enabled,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const m = useMutation({
    mutationFn: () => {
      if (!isConsentComplete(value)) throw new Error('incomplete');
      return acceptConsent({ ...buildConsentPayload(value.ageGroup, i18n.language ?? 'id'), ...(dob ? { tanggalLahir: dob } : {}) });
    },
    onSuccess: (data) => {
      qc.setQueryData(['consent-status', jemaatId], data);
      setValue(EMPTY_CONSENT);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
        // Ditolak karena usia → tawarkan perbaikan tanggal lahir.
        if (err.code === 'FORBIDDEN' || err.code === 'BAD_REQUEST') setShowDobFix(true);
      } else setError(t('error.network'));
    },
  });

  // Gagal memuat status → jangan blokir aplikasi (dicoba lagi nanti).
  if (!enabled || !q.data?.required) return null;
  if (segments[0] === 'legal' || segments[0] === '(auth)') return null;

  const updated = !!q.data.latest;
  const recordedAge = ageOf(q.data.birthDate);
  const effectiveDob = dob ?? q.data.birthDate ?? null;
  const effectiveAge = ageOf(effectiveDob);
  const showDob = showDobFix || (recordedAge != null && recordedAge < 18) || !!dob;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} className="bg-neutral-50">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
          <View className="items-center mb-4">
            <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <ShieldCheck size={28} color="#EA580C" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 text-center">
              {t(updated ? 'consent.gate_title_updated' : 'consent.gate_title')}
            </Text>
            <Text className="text-xs text-neutral-500 text-center mt-2 leading-relaxed">
              {t(updated ? 'consent.gate_sub_updated' : 'consent.gate_sub')}
            </Text>
          </View>
          {showDob ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 gap-2">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={16} color="#B45309" />
                <Text className="text-sm font-bold text-amber-900 flex-1">{t('consent.dob_title')}</Text>
              </View>
              <Text className="text-xs text-amber-900 leading-relaxed">
                {effectiveDob
                  ? t(dob ? 'consent.dob_new' : 'consent.dob_recorded', {
                      date: formatYmdLong(effectiveDob, i18n.language),
                      age: effectiveAge ?? '-',
                    })
                  : t('consent.dob_empty')}
              </Text>
              <Pressable onPress={() => setPickDob(true)} className="self-start rounded-full border border-amber-300 bg-card px-3 py-1.5">
                <Text className="text-xs font-bold text-amber-800">{t(dob ? 'consent.dob_change_again' : 'consent.dob_fix')}</Text>
              </Pressable>
            </View>
          ) : null}
          <ConsentChecklist
            value={value}
            onChange={(v) => {
              setValue(v);
              setError(undefined);
            }}
            error={error}
          />
        </ScrollView>
        <View className="px-5 py-3 gap-2 border-t bg-card border-neutral-100">
          <Button
            label={t('consent.agree_btn')}
            onPress={() => {
              if (!isConsentComplete(value)) {
                setError(t('consent.error_incomplete'));
                return;
              }
              m.mutate();
            }}
            loading={m.isPending}
            fullWidth
            size="lg"
          />
          <Pressable
            className="py-2 items-center"
            onPress={() =>
              Alert.alert(t('consent.decline_title'), t('consent.decline_msg'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('consent.decline_logout'), style: 'destructive', onPress: () => void logout() },
              ])
            }
          >
            {m.isPending ? <ActivityIndicator /> : <Text className="text-xs text-neutral-500">{t('consent.decline_btn')}</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
      {pickDob ? (
        <DatePickerModal
          value={effectiveDob ? parseLocalDate(effectiveDob) : new Date(2000, 0, 1)}
          onChange={(d) => {
            const iso = toIsoDate(d);
            setDob(iso);
            setError(undefined);
            const a = ageOf(iso);
            // Usia baru ≥ 18 → pilih "18 tahun ke atas" otomatis; 13–17 → dengan izin orang tua.
            if (a != null) setValue((v) => ({ ...v, ageGroup: a >= 18 ? 'ADULT' : a >= 13 ? 'MINOR_WITH_GUARDIAN' : v.ageGroup }));
          }}
          onClose={() => setPickDob(false)}
        />
      ) : null}
    </View>
  );
}
