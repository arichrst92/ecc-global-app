import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Fingerprint, KeyRound, LogOut, ScanFace } from 'lucide-react-native';

import {
  authenticate,
  getBiometricSupport,
  type BiometricSupport,
} from '@/services/biometric';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/components/ui/Toast';

/**
 * Full-screen biometric unlock gate.
 *
 * Tampil sebelum home screen kalau:
 * - isAuthenticated (sudah login)
 * - biometricEnabled (user sudah opt-in)
 * - biometricUnlocked === false (gate belum lewat sesi ini)
 *
 * Mount-time auto-trigger biometric prompt. Kalau user batal, tampil button
 * untuk retry atau "Login ulang" (yang akan logout + balik ke OTP flow).
 */
export function BiometricGate() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const markUnlocked = useAuthStore((s) => s.markBiometricUnlocked);
  const logout = useAuthStore((s) => s.logout);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const showToast = useToast((s) => s.show);

  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [attempting, setAttempting] = useState(false);

  const runAuth = useCallback(async () => {
    if (attempting) return;
    setAttempting(true);
    try {
      const result = await authenticate(t('biometric.prompt_unlock'));
      if (result.success) {
        markUnlocked();
        return;
      }
      // Kalau lockout / no_enrolled, kasih guidance + logout opsional
      if (result.reason === 'lockout') {
        showToast(t('biometric.lockout'), 'error');
      } else if (result.reason === 'no_enrolled' || result.reason === 'no_hardware') {
        // Biometric tidak lagi available — disable + let user log back in via OTP
        await setBiometricEnabled(false);
        showToast(t('biometric.no_longer_available'), 'info');
        markUnlocked();
      }
      // 'cancel' / 'fallback' / 'error' — stay di gate, user bisa retry
    } finally {
      setAttempting(false);
    }
  }, [attempting, markUnlocked, setBiometricEnabled, showToast, t]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getBiometricSupport();
      if (!mounted) return;
      setSupport(s);
      // Kalau device support, auto-trigger prompt sekali saat mount
      if (s.isAvailable) {
        runAuth();
      } else {
        // Device tidak support lagi (mis. biometric di-uninstall di OS)
        await setBiometricEnabled(false);
        markUnlocked();
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Icon =
    support?.primaryType === 'face'
      ? ScanFace
      : support?.primaryType === 'fingerprint'
        ? Fingerprint
        : KeyRound;
  const biometricLabel = support?.label ?? t('biometric.label_generic');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-24 h-24 rounded-3xl bg-brand-50 items-center justify-center mb-6">
          <Icon size={48} color="#EA580C" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 text-center mb-2">
          {t('biometric.gate_title')}
        </Text>
        <Text className="text-sm text-neutral-500 text-center mb-1">
          {user?.namaLengkap
            ? `${t('biometric.welcome_back')}, ${user.namaLengkap}`
            : t('biometric.welcome_back')}
        </Text>
        <Text className="text-sm text-neutral-500 text-center mb-8">
          {t('biometric.gate_subtitle', { method: biometricLabel })}
        </Text>

        <Pressable
          onPress={runAuth}
          disabled={attempting}
          className={`w-full flex-row items-center justify-center gap-2 py-4 rounded-2xl ${
            attempting ? 'bg-neutral-300' : 'bg-brand-500'
          }`}
        >
          <Icon size={20} color="#fff" />
          <Text className="text-base font-bold text-white">
            {attempting
              ? t('biometric.prompting')
              : t('biometric.try_again', { method: biometricLabel })}
          </Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await logout();
          }}
          className="mt-3 w-full flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-neutral-100"
        >
          <LogOut size={18} color="#525252" />
          <Text className="text-base font-semibold text-neutral-700">
            {t('biometric.use_otp_instead')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
