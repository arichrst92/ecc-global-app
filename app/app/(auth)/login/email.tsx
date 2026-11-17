/**
 * Login via magic link email — request form + "Check inbox" sent state.
 *
 * Flow:
 * 1. User input email → POST /auth/email/request-magic-link
 * 2. Response 200 always (anti-enumeration) → screen switch ke sent state
 * 3. Sent state: "Cek inbox lo untuk link login" + tombol Kirim Ulang (60s cooldown)
 * 4. User klik link di email → deeplink ecc://auth/email/verify?token=xxx
 *    → arahkan ke app/(auth)/email-verify.tsx (handled separately)
 *
 * Per BE notice magic-link 2026-07-28 (docs/backend-notice-magic-link-email-login.md).
 *
 * Web (2026-12): magic link membuka deeplink app, jadi di web dipakai kode
 * OTP 6 digit lewat email (POST /auth/email-otp/request LOGIN_EMAIL) lalu
 * layar /login/otp?email=… . Kode masuk dari admin cabang juga lewat layar itu.
 */
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Info, KeyRound, Mail } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { requestEmailOtp, requestMagicLink, resendMagicLink } from '@/api/auth';
import { SpamHint } from '@/components/auth/SpamHint';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

// Simple email regex — good enough untuk client-side pre-check.
// BE do the real validation via Zod.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cooldown Kirim Ulang biar user tidak spam BE (BE rate limit 5/jam per IP). */
const RESEND_COOLDOWN_SECONDS = 60;

const IS_WEB = Platform.OS === 'web';

export default function LoginEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  /** Layanan email gangguan → tawarkan OTP WhatsApp. */
  const [emailDown, setEmailDown] = useState(false);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown untuk tombol Kirim Ulang
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const requestMutation = useMutation({
    // Web: kode OTP email. App: magic link.
    mutationFn: async (emailInput: string) => {
      if (IS_WEB) {
        const r = await requestEmailOtp({ email: emailInput, purpose: 'LOGIN_EMAIL' });
        return { otp: true as const, admin: r?.channel === 'admin' };
      }
      await requestMagicLink({ email: emailInput });
      return { otp: false as const, admin: false };
    },
    onSuccess: (r, emailInput) => {
      if (r.otp) {
        router.push({ pathname: '/(auth)/login/otp', params: { email: emailInput, channel: r.admin ? 'admin' : 'email' } });
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if ((err.code as string) === 'EMAIL_UNAVAILABLE') {
          setEmailDown(true);
          setError(err.message);
        } else if (err.code === 'TOO_MANY_REQUESTS') {
          setError(t('auth.email.error_rate_limited'));
        } else if (err.code === 'BAD_REQUEST' || err.code === 'VALIDATION_ERROR') {
          setError(t('auth.email.error_invalid_format'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('error.network'));
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: (emailInput: string) => resendMagicLink({ email: emailInput }),
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (err) => {
      // Errors di resend tampil sebagai toast/inline error — tapi kita tidak
      // reset sent state supaya user tetap tau link sudah pernah dikirim.
      if (err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS') {
        setError(t('auth.email.error_rate_limited'));
      } else if (err instanceof ApiError && (err.code as string) === 'EMAIL_UNAVAILABLE') {
        setEmailDown(true);
        setError(err.message);
      } else {
        setError(t('error.network'));
      }
    },
  });

  function submit() {
    setError(null);
    setEmailDown(false);
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t('auth.email.error_invalid_format'));
      return;
    }
    requestMutation.mutate(trimmed);
  }

  function resend() {
    if (cooldown > 0) return;
    setError(null);
    resendMutation.mutate(email.trim().toLowerCase());
  }

  /** Kode masuk dari admin cabang → layar input kode (email). */
  function openAdminCode() {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t('auth.email.error_invalid_format'));
      return;
    }
    router.push({ pathname: '/(auth)/login/otp', params: { email: trimmed, channel: 'admin' } });
  }

  const emailDownBox = emailDown ? (
    <View className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Text className="text-sm text-amber-900 leading-5">{t('auth.email.down_msg')}</Text>
      <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-3 self-start rounded-lg bg-amber-600 px-3 py-2">
        <Text className="text-sm font-semibold text-white">{t('auth.email.down_cta')}</Text>
      </Pressable>
    </View>
  ) : null;

  const adminLink = (
    <Pressable onPress={openAdminCode} className="mt-5 flex-row items-center justify-center gap-1.5 py-2">
      <KeyRound size={14} color="#EA580C" />
      <Text className="text-sm font-semibold text-brand-600">{t('auth.admin_code_link')}</Text>
    </Pressable>
  );

  function useDifferentEmail() {
    setSent(false);
    setError(null);
    setCooldown(0);
  }

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <KeyboardSafeView
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        {/* App bar */}
        <View className="px-4 py-2">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            // ============ SENT STATE ============
            <>
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-5 mt-2">
                <CheckCircle2 size={32} color="#059669" />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 mb-2">
                {t('auth.email.sent_title')}
              </Text>
              <Text className="text-neutral-600 text-sm mb-2">
                {t('auth.email.sent_body_prefix')}
              </Text>
              <Text className="text-neutral-900 font-semibold mb-4">{email}</Text>
              <Text className="text-neutral-500 text-sm mb-4">
                {t('auth.email.sent_body_suffix')}
              </Text>
              <SpamHint className="mb-5" />

              {/* Instruction card */}
              <View className="p-4 bg-brand-50 border border-brand-100 rounded-xl mb-5">
                <View className="flex-row gap-2 mb-2">
                  <Info size={16} color={nc('#C2410C')} />
                  <Text className="text-xs font-bold text-brand-700 flex-1">
                    {t('auth.email.instruction_title')}
                  </Text>
                </View>
                <Text className="text-xs text-brand-700 leading-relaxed">
                  {t('auth.email.instruction_body')}
                </Text>
              </View>

              {error ? (
                <Text className="text-xs text-red-600 mb-3">{error}</Text>
              ) : null}
              {emailDownBox}

              {/* Resend + change email actions */}
              <View className="gap-3">
                <Button
                  label={
                    cooldown > 0
                      ? t('auth.email.resend_cooldown', { seconds: cooldown })
                      : t('auth.email.resend')
                  }
                  onPress={resend}
                  loading={resendMutation.isPending}
                  disabled={cooldown > 0}
                  variant="secondary"
                  fullWidth
                  size="lg"
                />
                <Pressable onPress={useDifferentEmail} className="py-3 items-center">
                  <Text className="text-brand-500 text-sm font-semibold">
                    {t('auth.email.use_different')}
                  </Text>
                </Pressable>
              </View>
              {adminLink}
            </>
          ) : (
            // ============ REQUEST STATE ============
            <>
              <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
                <Mail size={28} color="#EA580C" />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 mb-2">
                {t('auth.email.title')}
              </Text>
              <Text className="text-neutral-500 text-sm mb-7">
                {IS_WEB ? t('auth.email.subtitle_code') : t('auth.email.subtitle')}
              </Text>

              <TextField
                label={t('auth.email.label')}
                placeholder={t('auth.email.placeholder')}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                helper={!error ? t('auth.email.helper') : undefined}
                error={error ?? undefined}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                editable={!requestMutation.isPending}
              />

              <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
                <Info size={16} color={nc('#92400e')} />
                <Text className="text-xs text-amber-800 flex-1">
                  {t('auth.email.hint_legacy')}
                </Text>
              </View>
              {emailDownBox}
              {adminLink}
            </>
          )}
        </ScrollView>

        {!sent ? (
          <View className="px-6 pt-3 pb-3 bg-card border-t border-neutral-100">
            <Button
              label={IS_WEB ? t('auth.email.send_code') : t('auth.email.send_link')}
              onPress={submit}
              loading={requestMutation.isPending}
              disabled={email.trim().length < 3}
              fullWidth
              size="lg"
            />
          </View>
        ) : null}
      </KeyboardSafeView>
    </SafeAreaView>
  );
}
