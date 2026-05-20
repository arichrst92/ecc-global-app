import { useState } from 'react';
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
import { ArrowLeft, MessageCircleMore, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useToast } from '@/components/ui/Toast';
import { requestOtp } from '@/api/auth';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';

export default function LoginPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (e164: string) => requestOtp({ noHp: e164, purpose: 'LOGIN' }),
    onSuccess: (_data, e164) => {
      showToast(t('auth.otp_sent'), 'success');
      router.push({ pathname: '/(auth)/login/otp', params: { noHp: e164 } });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'NOT_FOUND') {
          setError(t('auth.error_not_registered'));
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
          <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
            <MessageCircleMore size={28} color="#EA580C" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.login_title')}</Text>
          <Text className="text-neutral-500 text-sm mb-7">{t('auth.login_sub')}</Text>

          <PhoneInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
            label={t('auth.phone_label')}
            placeholder={t('auth.phone_placeholder')}
            helper={!error ? t('auth.phone_helper') : undefined}
            error={error ?? undefined}
            autoFocus
            editable={!mutation.isPending}
          />

          <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
            <Info size={16} color="#92400e" />
            <Text className="text-xs text-amber-800 flex-1">{t('auth.not_registered_hint')}</Text>
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('auth.send_otp')}
            onPress={submit}
            loading={mutation.isPending}
            disabled={phone.length < 8}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
