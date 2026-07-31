/**
 * Magic link deeplink consumer.
 *
 * URL: ecc://auth/email/verify?token=xxx
 *
 * Flow:
 * 1. Extract token dari route params (expo-router auto-parse dari deeplink)
 * 2. Panggil POST /auth/email/verify-magic-link { token }
 * 3. Success 200 → auth.login(accessToken, refreshToken, user)
 *    - user.needsOnboarding=true → router.replace('/(auth)/onboarding')
 *    - false / undefined → router.replace('/(tabs)')
 * 4. Error 401 → show error state dengan CTA back ke Welcome
 * 5. Missing token → show error state
 *
 * Auth guard di app/_layout.tsx harus whitelist route ini supaya bisa diakses
 * tanpa session (M36.9).
 *
 * Per BE notice magic-link 2026-07-28.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { verifyMagicLink } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { getPostLoginRoute } from '@/utils/auth-route';
import { ApiError } from '@/types/api';

type Status = 'verifying' | 'success' | 'error';

export default function EmailVerifyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const login = useAuthStore((s) => s.login);

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // useRef supaya effect tidak double-fire (dev strict mode) — token one-time use
  // di BE. Kalau kepanggil 2x, request kedua kena 401 "already used".
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;

    async function verify() {
      const token = typeof params.token === 'string' ? params.token : null;

      if (!token || token.length < 32) {
        setStatus('error');
        setErrorMsg(t('auth.email.verify_error_missing'));
        return;
      }

      try {
        // api.post unwrap envelope — verifyMagicLink returns AuthSuccessData directly
        const { accessToken, refreshToken, user } = await verifyMagicLink({ token });

        await login(accessToken, refreshToken, user);
        setStatus('success');

        // Short delay biar user lihat "berhasil" splash → redirect
        setTimeout(() => {
          router.replace(getPostLoginRoute(user) as never);
        }, 800);
      } catch (err) {
        setStatus('error');
        if (err instanceof ApiError) {
          if (err.code === 'UNAUTHORIZED') {
            setErrorMsg(t('auth.email.verify_error_invalid'));
          } else if (err.code === 'TOO_MANY_REQUESTS') {
            setErrorMsg(t('auth.email.verify_error_rate_limited'));
          } else {
            setErrorMsg(err.message);
          }
        } else {
          setErrorMsg(t('error.network'));
        }
      }
    }

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        {status === 'verifying' ? (
          <>
            <View className="w-20 h-20 rounded-3xl bg-brand-50 items-center justify-center mb-6">
              <Mail size={36} color="#EA580C" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 mb-2">
              {t('auth.email.verify_loading_title')}
            </Text>
            <Text className="text-neutral-500 text-sm text-center mb-6">
              {t('auth.email.verify_loading_body')}
            </Text>
            <ActivityIndicator size="large" color="#EA580C" />
          </>
        ) : status === 'success' ? (
          <>
            <View className="w-20 h-20 rounded-3xl bg-emerald-50 items-center justify-center mb-6">
              <CheckCircle2 size={40} color="#059669" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 mb-2">
              {t('auth.email.verify_success_title')}
            </Text>
            <Text className="text-neutral-500 text-sm text-center">
              {t('auth.email.verify_success_body')}
            </Text>
          </>
        ) : (
          <>
            <View className="w-20 h-20 rounded-3xl bg-red-50 items-center justify-center mb-6">
              <AlertTriangle size={36} color="#DC2626" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 mb-2 text-center">
              {t('auth.email.verify_error_title')}
            </Text>
            <Text className="text-neutral-600 text-sm text-center mb-6">
              {errorMsg ?? t('auth.email.verify_error_generic')}
            </Text>
            <View className="w-full gap-3">
              <Button
                label={t('auth.email.verify_error_try_again')}
                onPress={() => router.replace('/(auth)/login/email' as never)}
                fullWidth
                size="lg"
              />
              <Pressable
                onPress={() => router.replace('/(auth)/welcome')}
                className="py-3 items-center"
              >
                <Text className="text-neutral-500 text-sm font-semibold">
                  {t('auth.email.verify_error_back_welcome')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
