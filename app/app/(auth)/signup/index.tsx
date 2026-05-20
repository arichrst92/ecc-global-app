import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import { requestOtp } from '@/api/auth';
import { useSignupStore } from '@/stores/signup.store';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';

export default function SignupPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const reset = useSignupStore((s) => s.reset);
  const setNoHp = useSignupStore((s) => s.setNoHp);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (e164: string) => requestOtp({ noHp: e164, purpose: 'ENROLLMENT' }),
    onSuccess: (_data, e164) => {
      setNoHp(e164);
      showToast(t('auth.otp_sent'), 'success');
      router.push('/(auth)/signup/otp');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          setError(t('signup.error_already_registered'));
        } else if (err.code === 'TOO_MANY_REQUESTS') {
          setError(t('auth.error_rate_limited'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('error.network'));
      }
    },
  });

  function submit() {
    setError(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError(t('auth.error_invalid_phone'));
      return;
    }
    mutation.mutate(e164);
  }

  function handleBack() {
    reset();
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-2">
        <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color="#171717" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Stepper current={1} total={3} />

        <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-5 mt-4">
          <UserPlus size={28} color="#059669" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('signup.title')}</Text>
        <Text className="text-neutral-500 text-sm mb-7">{t('signup.sub')}</Text>

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
      </ScrollView>

      <View className="px-6 pb-8">
        <Button
          label={t('auth.send_otp')}
          onPress={submit}
          loading={mutation.isPending}
          disabled={phone.length < 8}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
