import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react-native';

import { OtpInput } from '@/components/ui/OtpInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import { SpamHint } from '@/components/auth/SpamHint';
import { requestEmailOtp, requestOtp, verifyEmailOtpEnrollment, verifyOtpEnrollment } from '@/api/auth';
import { useSignupStore } from '@/stores/signup.store';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const RESEND_COOLDOWN_SEC = 60;

/**
 * Daftar langkah 2 — masukkan kode. Saluran mengikuti langkah 1:
 * WhatsApp (nomor HP) atau email (kode 6 digit, berlaku 10 menit).
 */
export default function SignupOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const channel = useSignupStore((s) => s.channel);
  const noHp = useSignupStore((s) => s.noHp);
  const signupEmail = useSignupStore((s) => s.email);
  const otpViaEmail = useSignupStore((s) => s.otpViaEmail);
  const setSignupField = useSignupStore((s) => s.setField);
  const setOtpVerified = useSignupStore((s) => s.setOtpVerified);
  const viaEmailChannel = channel === 'email';

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [error, setError] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Verify → penanda pendaftaran (tanpa JWT) + masa berlaku (BE: 60 menit).
  const verifyMutation = useMutation({
    mutationFn: async (code: string) =>
      viaEmailChannel
        ? verifyEmailOtpEnrollment({ email: signupEmail, kode: code })
        : verifyOtpEnrollment({ noHp, kode: code }),
    onSuccess: (data) => {
      setOtpVerified(data.validForSeconds);
      showToast(t('signup.otp_verified'), 'success');
      router.push('/(auth)/signup/data');
    },
    onError: (err) => {
      setOtpKey((k) => k + 1);
      if (err instanceof ApiError) {
        setError(err.code === 'UNAUTHORIZED' ? t('auth.error_otp_invalid') : err.message);
      } else {
        setError(t('error.network'));
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () =>
      viaEmailChannel
        ? requestEmailOtp({ email: signupEmail, purpose: 'ENROLLMENT_EMAIL' })
        : requestOtp({ noHp, purpose: 'ENROLLMENT', email: signupEmail || undefined }),
    onSuccess: (data) => {
      const toEmail = viaEmailChannel || !!data?.channel?.includes('email');
      if (!viaEmailChannel && toEmail) setSignupField('otpViaEmail', true);
      setCooldown(RESEND_COOLDOWN_SEC);
      showToast(toEmail ? t('auth.otp_resent_email') : t('auth.otp_resent'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <View className="px-4 py-2">
        <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color={nc('#171717')} />
        </Pressable>
      </View>

      <KeyboardSafeView className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Stepper current={2} total={3} />

        <View className="w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mb-4 mt-3">
          {viaEmailChannel ? <Mail size={28} color="#059669" /> : <ShieldCheck size={28} color="#059669" />}
        </View>
        <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.otp_title')}</Text>
        <Text className="text-neutral-500 text-sm">{viaEmailChannel ? t('signup.otp_sub_email') : t('auth.otp_sub')}</Text>
        <Text className="text-neutral-900 font-semibold mt-1 mb-4">{viaEmailChannel ? signupEmail : formatPhoneDisplay(noHp)}</Text>

        <OtpInput
          key={otpKey}
          onComplete={(code) => {
            setError(null);
            verifyMutation.mutate(code);
          }}
          onChange={() => setError(null)}
          disabled={verifyMutation.isPending}
        />

        {error ? <Text className="text-sm text-red-600 mt-3 text-center">{error}</Text> : null}
        {viaEmailChannel ? (
          <SpamHint className="mt-5" />
        ) : otpViaEmail ? (
          <View className="flex-row gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mt-5">
            <Mail size={18} color="#B45309" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5 text-amber-900">
              {t('auth.otp_email_note')} {t('auth.spam_hint')}
            </Text>
          </View>
        ) : null}


        <View className="items-center mt-8">
          {cooldown > 0 ? (
            <Text className="text-sm text-neutral-500">{t('auth.otp_resend_in', { seconds: cooldown })}</Text>
          ) : (
            <Pressable onPress={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
              <Text className="text-sm font-semibold text-brand-600">
                {resendMutation.isPending ? t('common.loading') : t('auth.otp_resend')}
              </Text>
            </Pressable>
          )}
          {/* Kode WhatsApp tidak datang (gangguan) → daftar dengan email. */}
          {!viaEmailChannel ? (
            <Pressable
              onPress={() => {
                setSignupField('channel', 'email');
                setSignupField('switchToEmail', true);
                goBack(router);
              }}
              className="mt-4"
              hitSlop={8}
            >
              <Text className="text-sm text-neutral-600 text-center">
                {t('signup.no_code_use_email')} <Text className="font-semibold text-brand-600">{t('signup.channel_email')}</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}
