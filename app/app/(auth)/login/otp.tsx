import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react-native';

import { OtpInput } from '@/components/ui/OtpInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useToast } from '@/components/ui/Toast';
import { SpamHint } from '@/components/auth/SpamHint';
import { requestEmailOtp, requestOtp, verifyEmailOtpLogin, verifyOtpLogin } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { formatPhoneDisplay } from '@/utils/phone';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const RESEND_COOLDOWN_SEC = 60;

/**
 * Layar input kode login.
 *   ?noHp=…               — OTP WhatsApp (viaEmail=1 → kode juga dikirim ke email).
 *   ?email=…              — kode 6 digit lewat email (web).
 *   ?channel=admin        — kode masuk sementara dari admin cabang (OTP tidak dikirim).
 * Kode admin cabang selalu diterima di kolom yang sama.
 */
export default function LoginOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const login = useAuthStore((s) => s.login);
  const params = useLocalSearchParams<{ noHp?: string; email?: string; viaEmail?: string; channel?: string }>();
  const noHp = params.noHp ?? '';
  const email = params.email ?? '';
  const byEmail = !noHp && !!email;
  // OTP juga dikirim ke email (WhatsApp sedang antre) → tampilkan keterangan.
  const [viaEmail, setViaEmail] = useState(params.viaEmail === '1');
  const [adminMode, setAdminMode] = useState(params.channel === 'admin');
  const [showAdminHelp, setShowAdminHelp] = useState(false);

  const [cooldown, setCooldown] = useState(adminMode ? 0 : RESEND_COOLDOWN_SEC);
  const [error, setError] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) =>
      byEmail ? verifyEmailOtpLogin({ email, kode: code }) : verifyOtpLogin({ noHp, kode: code }),
    onSuccess: async (data) => {
      await login(data.accessToken, data.refreshToken, data.user);
      showToast(t('auth.login_success'), 'success');
      // Redirect handled di root _layout by isAuthenticated change
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
      byEmail ? requestEmailOtp({ email, purpose: 'LOGIN_EMAIL' }) : requestOtp({ noHp, purpose: 'LOGIN' }),
    onSuccess: (data) => {
      setCooldown(RESEND_COOLDOWN_SEC);
      if (data?.channel === 'admin') {
        setAdminMode(true);
        showToast(t('auth.otp_admin_note'), 'success');
        return;
      }
      setAdminMode(false);
      const toEmail = byEmail || !!data?.channel?.includes('email');
      if (!byEmail && toEmail) setViaEmail(true);
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
        <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-4 mt-2">
          {adminMode ? <KeyRound size={28} color="#EA580C" /> : byEmail ? <Mail size={28} color="#EA580C" /> : <ShieldCheck size={28} color="#EA580C" />}
        </View>
        <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.otp_title')}</Text>
        <Text className="text-neutral-500 text-sm">
          {adminMode ? t('auth.otp_admin_note') : byEmail ? t('auth.otp_sub_email') : t('auth.otp_sub')}
        </Text>
        <Text className="text-neutral-900 font-semibold mt-1 mb-4">{byEmail ? email : formatPhoneDisplay(noHp)}</Text>

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
        {!adminMode && byEmail ? <SpamHint className="mt-5" /> : null}
        {!adminMode && !byEmail && viaEmail ? (
          <View className="flex-row gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mt-5">
            <Mail size={18} color="#B45309" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5 text-amber-900">
              {t('auth.otp_email_note')} {t('auth.spam_hint')}
            </Text>
          </View>
        ) : null}


        {/* Resend */}
        <View className="items-center mt-8">
          {cooldown > 0 ? (
            <Text className="text-sm text-neutral-500">{t('auth.otp_resend_in', { seconds: cooldown })}</Text>
          ) : (
            <Pressable onPress={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
              <Text className="text-sm font-semibold text-brand-600">
                {resendMutation.isPending ? t('common.loading') : adminMode ? t('auth.otp_send_instead') : t('auth.otp_resend')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Jalan terakhir: kode dari admin cabang */}
        {!adminMode ? (
          <View className="items-center mt-6">
            <Pressable onPress={() => setShowAdminHelp((v) => !v)} hitSlop={8} className="flex-row items-center gap-1.5">
              <KeyRound size={14} color={nc('#737373')} />
              <Text className="text-sm text-neutral-600 underline">{t('auth.admin_code_link')}</Text>
            </Pressable>
            {showAdminHelp ? (
              <Text className="text-xs text-neutral-500 text-center mt-2 leading-5 px-2">{t('auth.admin_code_help')}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}
