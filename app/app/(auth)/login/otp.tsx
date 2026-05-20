import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';

import { OtpInput } from '@/components/ui/OtpInput';
import { useToast } from '@/components/ui/Toast';
import { requestOtp, verifyOtpLogin } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';

const RESEND_COOLDOWN_SEC = 60;

export default function LoginOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const login = useAuthStore((s) => s.login);
  const { noHp } = useLocalSearchParams<{ noHp: string }>();

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [error, setError] = useState<string | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => verifyOtpLogin({ noHp, kode: code }),
    onSuccess: async (data) => {
      await login(data.accessToken, data.refreshToken, data.user);
      showToast(t('auth.login_success'), 'success');
      // Redirect handled di root _layout by isAuthenticated change
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'UNAUTHORIZED') {
          setError(t('auth.error_otp_invalid'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('error.network'));
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => requestOtp({ noHp, purpose: 'LOGIN' }),
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_SEC);
      showToast(t('auth.otp_resent'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-2">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color="#171717" />
        </Pressable>
      </View>

      <View className="flex-1 px-6">
        <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
          <ShieldCheck size={28} color="#EA580C" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.otp_title')}</Text>
        <Text className="text-neutral-500 text-sm">{t('auth.otp_sub')}</Text>
        <Text className="text-neutral-900 font-semibold mb-7 mt-1">{formatPhoneDisplay(noHp)}</Text>

        <OtpInput
          onComplete={(code) => {
            setError(null);
            verifyMutation.mutate(code);
          }}
          onChange={() => setError(null)}
          disabled={verifyMutation.isPending}
        />

        {error ? <Text className="text-sm text-red-600 mt-3 text-center">{error}</Text> : null}

        {/* Resend */}
        <View className="items-center mt-8">
          {cooldown > 0 ? (
            <Text className="text-sm text-neutral-500">
              {t('auth.otp_resend_in', { seconds: cooldown })}
            </Text>
          ) : (
            <Pressable
              onPress={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              <Text className="text-sm font-semibold text-brand-600">
                {resendMutation.isPending ? t('common.loading') : t('auth.otp_resend')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
