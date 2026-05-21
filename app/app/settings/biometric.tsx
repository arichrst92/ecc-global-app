import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Fingerprint,
  LogOut,
  ScanFace,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react-native';

import {
  authenticate,
  getBiometricSupport,
  type BiometricSupport,
} from '@/services/biometric';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';

/**
 * Settings: toggle biometric unlock on/off.
 * Enable: trigger biometric prompt → kalau success, set flag.
 * Disable: clear flag immediately (no biometric required to turn off).
 */
export default function BiometricSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const forgetDevice = useAuthStore((s) => s.forgetDevice);

  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getBiometricSupport();
      if (mounted) setSupport(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleToggle(next: boolean) {
    if (submitting || !support) return;
    if (next && !support.isAvailable) {
      showToast(t('biometric.not_available_on_device'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (next) {
        // Enable: butuh biometric verification dulu sebelum simpan flag
        const result = await authenticate(
          t('biometric.prompt_enable', { method: support.label }),
        );
        if (result.success) {
          await setBiometricEnabled(true);
          showToast(t('biometric.enrolled_success', { method: support.label }), 'success');
        } else if (result.reason !== 'cancel' && result.reason !== 'fallback') {
          showToast(t('biometric.enroll_failed'), 'error');
        }
      } else {
        // Disable: tidak butuh verification — user bisa langsung opt-out
        await setBiometricEnabled(false);
        showToast(t('biometric.disabled'), 'info');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const Icon =
    support?.primaryType === 'face'
      ? ScanFace
      : support?.primaryType === 'fingerprint'
        ? Fingerprint
        : ShieldCheck;
  const biometricLabel = support?.label ?? t('biometric.label_generic');

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('biometric.settings_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Hero card */}
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View
            className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${
              biometricEnabled ? 'bg-brand-50' : 'bg-neutral-100'
            }`}
          >
            <Icon size={32} color={biometricEnabled ? '#EA580C' : '#737373'} />
          </View>
          <Text className="text-lg font-bold text-neutral-900 mb-1">
            {t('biometric.settings_hero_title', { method: biometricLabel })}
          </Text>
          <Text className="text-sm text-neutral-500 text-center leading-relaxed">
            {t('biometric.settings_hero_sub')}
          </Text>
        </View>

        {/* Toggle row */}
        <View className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center mb-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-neutral-900">
              {t('biometric.settings_toggle_label', { method: biometricLabel })}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {support?.isAvailable
                ? biometricEnabled
                  ? t('biometric.settings_on_hint')
                  : t('biometric.settings_off_hint')
                : t('biometric.not_available_on_device')}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggle}
            disabled={submitting || !support?.isAvailable}
            trackColor={{ true: '#FED7AA', false: '#E5E5E5' }}
            thumbColor={biometricEnabled ? '#EA580C' : '#FAFAFA'}
          />
        </View>

        {/* Security info */}
        <View className="bg-emerald-50 rounded-2xl p-4 flex-row items-start gap-3">
          <ShieldCheck size={18} color="#059669" />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-emerald-800 mb-1">
              {t('biometric.security_title')}
            </Text>
            <Text className="text-xs text-emerald-700 leading-relaxed">
              {t('biometric.security_body')}
            </Text>
          </View>
        </View>

        {!support?.isAvailable ? (
          <View className="mt-4 bg-amber-50 rounded-2xl p-4 flex-row items-start gap-3">
            <ShieldOff size={18} color="#D97706" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-amber-800 mb-1">
                {t('biometric.not_available_title')}
              </Text>
              <Text className="text-xs text-amber-700 leading-relaxed">
                {!support?.hasHardware
                  ? t('biometric.no_hardware')
                  : t('biometric.no_enrollment')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Forget device — hard logout pattern */}
        <Pressable
          onPress={async () => {
            await forgetDevice();
            showToast(t('biometric.device_forgotten'), 'info');
            router.replace('/(auth)/welcome');
          }}
          className="mt-6 py-3 flex-row items-center justify-center gap-2"
        >
          <LogOut size={16} color="#DC2626" />
          <Text className="text-sm font-semibold text-red-600">
            {t('biometric.forget_device')}
          </Text>
        </Pressable>
        <Text className="text-xs text-neutral-400 text-center mt-1 px-4 leading-relaxed">
          {t('biometric.forget_device_sub')}
        </Text>
      </ScrollView>
    </View>
  );
}
