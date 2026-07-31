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
 */
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Info, Mail } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { requestMagicLink, resendMagicLink } from '@/api/auth';
import { ApiError } from '@/types/api';

// Simple email regex — good enough untuk client-side pre-check.
// BE do the real validation via Zod.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cooldown Kirim Ulang biar user tidak spam BE (BE rate limit 5/jam per IP). */
const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();

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
    mutationFn: (emailInput: string) => requestMagicLink({ email: emailInput }),
    onSuccess: () => {
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'TOO_MANY_REQUESTS') {
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
      } else {
        setError(t('error.network'));
      }
    },
  });

  function submit() {
    setError(null);
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

  function useDifferentEmail() {
    setSent(false);
    setError(null);
    setCooldown(0);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        {/* App bar */}
        <View className="px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
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
              <Text className="text-neutral-500 text-sm mb-6">
                {t('auth.email.sent_body_suffix')}
              </Text>

              {/* Instruction card */}
              <View className="p-4 bg-brand-50 border border-brand-100 rounded-xl mb-5">
                <View className="flex-row gap-2 mb-2">
                  <Info size={16} color="#C2410C" />
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
                {t('auth.email.subtitle')}
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
                <Info size={16} color="#92400e" />
                <Text className="text-xs text-amber-800 flex-1">
                  {t('auth.email.hint_legacy')}
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {!sent ? (
          <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
            <Button
              label={t('auth.email.send_link')}
              onPress={submit}
              loading={requestMutation.isPending}
              disabled={email.trim().length < 3}
              fullWidth
              size="lg"
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
