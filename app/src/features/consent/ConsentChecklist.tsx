/**
 * Daftar centang persetujuan S&K + Kebijakan Privasi (kepatuhan no. 2).
 * Dipakai di layar daftar akun dan di layar setuju ulang (ConsentGate).
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';

import type { ConsentAgeGroup } from '@/api/consent';

export interface ConsentValue {
  terms: boolean;
  sensitive: boolean;
  ageGroup: ConsentAgeGroup | null;
}

export const EMPTY_CONSENT: ConsentValue = { terms: false, sensitive: false, ageGroup: null };

export function isConsentComplete(v: ConsentValue): v is ConsentValue & { ageGroup: ConsentAgeGroup } {
  return v.terms && v.sensitive && v.ageGroup != null;
}

function Box({ checked, round }: { checked: boolean; round?: boolean }) {
  return (
    <View
      className={`w-5 h-5 mt-0.5 items-center justify-center border-2 ${round ? 'rounded-full' : 'rounded-md'} ${
        checked ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-300'
      }`}
    >
      {checked ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
    </View>
  );
}

export function ConsentChecklist({
  value,
  onChange,
  error,
}: {
  value: ConsentValue;
  onChange: (v: ConsentValue) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="bg-card rounded-2xl p-4 border border-neutral-100 gap-3">
      <Text className="text-sm font-semibold text-neutral-900">{t('consent.title')}</Text>

      <Pressable onPress={() => onChange({ ...value, terms: !value.terms })} className="flex-row gap-3">
        <Box checked={value.terms} />
        <Text className="flex-1 text-xs text-neutral-700 leading-relaxed">
          {t('consent.terms_prefix')}{' '}
          <Text className="font-bold text-brand-600" onPress={() => router.push('/legal/terms' as never)}>
            {t('legal.terms_title')}
          </Text>{' '}
          {t('consent.and')}{' '}
          <Text className="font-bold text-brand-600" onPress={() => router.push('/legal/privacy' as never)}>
            {t('legal.privacy_title')}
          </Text>
          .
        </Text>
      </Pressable>

      <Pressable onPress={() => onChange({ ...value, sensitive: !value.sensitive })} className="flex-row gap-3">
        <Box checked={value.sensitive} />
        <Text className="flex-1 text-xs text-neutral-700 leading-relaxed">{t('consent.sensitive')}</Text>
      </Pressable>

      <View className="h-px bg-neutral-100" />
      <Text className="text-xs font-semibold text-neutral-900">{t('consent.age_title')}</Text>
      {(['ADULT', 'MINOR_WITH_GUARDIAN'] as const).map((g) => (
        <Pressable key={g} onPress={() => onChange({ ...value, ageGroup: g })} className="flex-row gap-3">
          <Box checked={value.ageGroup === g} round />
          <Text className="flex-1 text-xs text-neutral-700 leading-relaxed">
            {t(g === 'ADULT' ? 'consent.age_adult' : 'consent.age_minor')}
          </Text>
        </Pressable>
      ))}
      <Text className="text-[11px] text-neutral-500 leading-relaxed">{t('consent.age_under13')}</Text>

      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
