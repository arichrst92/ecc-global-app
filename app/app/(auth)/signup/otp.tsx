import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';

import { OtpInput } from '@/components/ui/OtpInput';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import { requestOtp, verifyOtpEnrollment } from '@/api/auth';
import { useSignupStore } from '@/stores/signup.store';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';

const RESEND_COOLDOWN_SEC = 60;

export default function SignupOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const noHp = useSignupStore((s) => s.noHp);
  const setOtpVerified = useSignupStore((s) => s.setOtpVerified);

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Per BE patch 2026-05-21c: verify OTP ENROLLMENT return structured data:
  // { otpVerified, purpose, noHp, pendingRegistration, nextStep, validForSeconds }
  // — tanpa JWT (jemaat belum ada). Mobile simpan validForSeconds untuk track
  // window 15 menit sebelum harus lanjut /auth/register.
  const verifyMutation = useMutation({
    mutationFn: async (code: string) => verifyOtpEnrollment({ noHp, kode: code }),
    onSuccess: (data) => {
      // BE return validForSeconds (default 900 = 15 menit)
      setOtpVerified(data.validForSeconds);
      showToast(t('signup.otp_verified'), 'success');
      router.push('/(auth)/signup/data');
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
    mutationFn: async () => requestOtp({ noHp, purpose: 'ENROLLMENT' }),
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
        <Stepper current={2} total={3} />

        <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-5 mt-4">
          <ShieldCheck size={28} color="#059669" />
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
