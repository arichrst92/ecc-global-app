import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { TextField } from '@/components/ui/TextField';
import { Stepper } from '@/components/ui/Stepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { requestEmailOtp, requestOtp } from '@/api/auth';
import { useSignupStore } from '@/stores/signup.store';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Daftar langkah 1 — pilih saluran:
 *   - WhatsApp: nomor HP (+ email opsional) → OTP WhatsApp.
 *   - Email: alamat email → OTP 6 digit lewat email.
 * Saluran gangguan → tawarkan pindah ke saluran lain.
 */
export default function SignupPhoneScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const reset = useSignupStore((s) => s.reset);
  const setNoHp = useSignupStore((s) => s.setNoHp);
  const setField = useSignupStore((s) => s.setField);

  const [channel, setChannel] = useState<'whatsapp' | 'email'>(() => useSignupStore.getState().channel);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(() => useSignupStore.getState().email);
  const [emailError, setEmailError] = useState<string | null>(null);
  /** Saluran yang sedang gangguan → kotak saran pindah saluran. */
  const [down, setDown] = useState<'whatsapp' | 'email' | null>(null);
  /** Sudah terdaftar → tombol langsung ke Masuk (sesuai saluran). */
  const [registered, setRegistered] = useState<'whatsapp' | 'email' | null>(null);

  const switchChannel = (c: 'whatsapp' | 'email') => {
    setChannel(c);
    setError(null);
    setEmailError(null);
    setDown(null);
    setRegistered(null);
  };

  const mutation = useMutation({
    // Saluran ikut dikirim sebagai variabel → tidak tertukar bila tab diganti saat menunggu.
    mutationFn: async ({ ch, target }: { ch: 'whatsapp' | 'email'; target: string }) =>
      ch === 'email'
        ? requestEmailOtp({ email: target, purpose: 'ENROLLMENT_EMAIL' })
        : requestOtp({ noHp: target, purpose: 'ENROLLMENT' }),
    onSuccess: (data, { ch, target }) => {
      setField('channel', ch);
      if (ch === 'email') {
        setNoHp('');
        setField('email', target);
        setField('otpViaEmail', false);
        showToast(t('signup.code_sent_email'), 'success');
      } else {
        setNoHp(target);
        // Email tidak diminta di daftar WhatsApp — ditambahkan & diverifikasi nanti di Profil.
        setField('email', '');
        const viaEmail = !!data?.channel?.includes('email');
        setField('otpViaEmail', viaEmail);
        showToast(viaEmail ? t('auth.otp_sent_email') : t('auth.otp_sent'), 'success');
      }
      router.push('/(auth)/signup/otp');
    },
    onError: (err, { ch }) => {
      if (!(err instanceof ApiError)) {
        if (ch === 'email') setEmailError(t('error.network'));
        else setError(t('error.network'));
        return;
      }
      const code = err.code as string;
      if (code === 'WHATSAPP_UNAVAILABLE') {
        setDown('whatsapp');
      } else if (code === 'EMAIL_UNAVAILABLE' || code === 'EMAIL_SIGNUP_DISABLED') {
        setDown('email');
      } else if (err.code === 'CONFLICT' && /email/i.test(err.message)) {
        setEmailError(ch === 'email' ? t('signup.email_already_registered') : err.message);
        setRegistered('email');
      } else if (err.code === 'CONFLICT') {
        setError(t('signup.error_already_registered'));
        setRegistered('whatsapp');
      } else if (err.code === 'TOO_MANY_REQUESTS') {
        setError(t('auth.error_rate_limited'));
      } else if (ch === 'email') {
        setEmailError(err.message);
      } else {
        setError(err.message);
      }
    },
  });

  function submit() {
    setError(null);
    setEmailError(null);
    setDown(null);
    setRegistered(null);
    const em = email.trim().toLowerCase();
    if (channel === 'email') {
      if (!EMAIL_RE.test(em)) {
        setEmailError(t('signup.email_invalid'));
        return;
      }
      mutation.mutate({ ch: 'email', target: em });
      return;
    }
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError(invalidPhoneMessage(phone, i18n.language === 'en' ? 'en' : 'id'));
      return;
    }
    mutation.mutate({ ch: 'whatsapp', target: e164 });
  }

  function handleBack() {
    reset();
    goBack(router);
  }

  const canSubmit = channel === 'email' ? email.trim().length > 5 : phone.length >= 8;

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <KeyboardSafeView keyboardVerticalOffset={0} className="flex-1">
        <View className="px-4 py-2">
          <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Stepper current={1} total={3} />

          <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-5 mt-4">
            <UserPlus size={28} color="#059669" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('signup.title')}</Text>
          <Text className="text-neutral-500 text-sm mb-5">{t('signup.sub')}</Text>

          <SegmentedControl<'whatsapp' | 'email'>
            label={t('signup.channel_label')}
            value={channel}
            options={[
              { value: 'whatsapp', label: t('signup.channel_whatsapp') },
              { value: 'email', label: t('signup.channel_email') },
            ]}
            onChange={(c) => !mutation.isPending && switchChannel(c)}
          />

          <View className="mt-4">
            {channel === 'whatsapp' ? (
              <>
                <PhoneInput
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setError(null);
                  }}
                  label={t('auth.phone_label')}
                  placeholder={t('auth.phone_placeholder')}
                  helper={!error ? t('signup.phone_helper') : undefined}
                  error={error ?? undefined}
                  autoFocus
                  editable={!mutation.isPending}
                />
              </>
            ) : (
              <>
                <TextField
                  label={t('signup.email_only_label')}
                  placeholder={t('signup.email_placeholder')}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  helper={!emailError ? t('signup.email_only_helper') : undefined}
                  error={emailError ?? undefined}
                  editable={!mutation.isPending}
                  autoFocus
                />
                {error ? <Text className="text-xs text-red-600 mt-2">{error}</Text> : null}
              </>
            )}
          </View>

          {registered ? (
            <Pressable
              onPress={() => {
                reset();
                router.replace(registered === 'email' ? '/(auth)/login/email' : '/(auth)/login');
              }}
              className="mt-4 self-start rounded-lg bg-brand-600 px-3 py-2"
            >
              <Text className="text-sm font-semibold text-white">
                {registered === 'email' ? t('auth.signin_email') : t('auth.signin_otp')}
              </Text>
            </Pressable>
          ) : null}
          {down ? (
            <View className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <View className="flex-row gap-2">
                <AlertTriangle size={18} color="#B45309" style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-amber-900">
                    {down === 'whatsapp' ? t('signup.wa_down_title') : t('signup.email_down_title')}
                  </Text>
                  <Text className="text-sm text-amber-900 mt-0.5 leading-5">
                    {down === 'whatsapp' ? t('signup.wa_down_msg') : t('signup.email_down_msg')}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => switchChannel(down === 'whatsapp' ? 'email' : 'whatsapp')}
                className="mt-3 self-start rounded-lg bg-amber-600 px-3 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {down === 'whatsapp' ? t('signup.wa_down_cta') : t('signup.email_down_cta')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-card border-t border-neutral-100">
          <Button
            label={channel === 'email' ? t('signup.send_email_code') : t('auth.send_otp')}
            onPress={submit}
            loading={mutation.isPending}
            disabled={!canSubmit}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}
