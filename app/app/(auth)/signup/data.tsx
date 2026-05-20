import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, Clock } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Picker } from '@/components/ui/Picker';
import { register } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useSignupStore } from '@/stores/signup.store';
import { useBranches } from '@/hooks/useBranches';
import { ApiError } from '@/types/api';

type FieldErrors = Partial<{
  namaLengkap: string;
  jenisKelamin: string;
  cabangId: string;
}>;

export default function SignupDataScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  // Get state via individual selectors untuk reactivity
  const noHp = useSignupStore((s) => s.noHp);
  const namaLengkap = useSignupStore((s) => s.namaLengkap);
  const jenisKelamin = useSignupStore((s) => s.jenisKelamin);
  const cabangId = useSignupStore((s) => s.cabangId);
  const otpVerifiedExpiresAt = useSignupStore((s) => s.otpVerifiedExpiresAt);
  const setField = useSignupStore((s) => s.setField);
  const reset = useSignupStore((s) => s.reset);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Countdown timer untuk window OTP enrollment (15 min)
  useEffect(() => {
    if (!otpVerifiedExpiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((otpVerifiedExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        Alert.alert(t('signup.error_otp_expired_title'), t('signup.error_otp_expired_msg'), [
          {
            text: 'OK',
            onPress: () => {
              reset();
              router.replace('/(auth)/signup');
            },
          },
        ]);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [otpVerifiedExpiresAt, reset, router, t]);

  const branchesQuery = useBranches();

  const mutation = useMutation({
    mutationFn: async () =>
      register({
        // Per BE patch 2026-05-21d — hanya 4 field wajib. tanggalLahir,
        // alamat, foto user lengkapi nanti via Profile → Edit.
        noHp,
        namaLengkap,
        jenisKelamin: jenisKelamin as 'L' | 'P',
        cabangId,
      }),
    onSuccess: async (data) => {
      await login(data.accessToken, data.refreshToken, data.user);
      router.replace('/(auth)/signup/success');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details?.fieldErrors) {
          const fe = err.details.fieldErrors;
          setErrors({
            namaLengkap: fe.namaLengkap?.[0],
            jenisKelamin: fe.jenisKelamin?.[0],
            cabangId: fe.cabangId?.[0],
          });
        } else if (err.code === 'UNAUTHORIZED') {
          Alert.alert(t('signup.error_otp_expired_title'), t('signup.error_otp_expired_msg'), [
            { text: 'OK', onPress: () => router.replace('/(auth)/signup') },
          ]);
        } else if (err.code === 'CONFLICT') {
          Alert.alert(t('signup.error_already_registered'));
        } else {
          Alert.alert(t('error.generic'), err.message);
        }
      } else {
        Alert.alert(t('error.network'));
      }
    },
  });

  function submit() {
    const next: FieldErrors = {};
    if (!namaLengkap || namaLengkap.length < 2) next.namaLengkap = t('signup.error_name_required');
    if (!jenisKelamin) next.jenisKelamin = t('signup.error_gender_required');
    if (!cabangId) next.cabangId = t('signup.error_branch_required');

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    mutation.mutate();
  }

  function handleBack() {
    Alert.alert(t('signup.cancel_confirm_title'), t('signup.cancel_confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  const branchOptions = (branchesQuery.data ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    sub: b.alamat,
  }));

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="px-4 py-2 bg-white">
        <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color="#171717" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
        <Stepper current={3} total={3} />

        <Text className="text-2xl font-bold text-neutral-900 mt-3 mb-1">{t('signup.data_title')}</Text>
        <Text className="text-neutral-500 text-sm mb-3">{t('signup.data_sub')}</Text>

        {/* OTP window countdown */}
        {secondsLeft !== null && secondsLeft > 0 ? (
          <View
            className={`flex-row items-center gap-2 px-3 py-2 rounded-xl mb-4 ${
              secondsLeft < 120
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-neutral-50 border border-neutral-200'
            }`}
          >
            <Clock size={14} color={secondsLeft < 120 ? '#D97706' : '#737373'} />
            <Text
              className={`text-xs flex-1 ${
                secondsLeft < 120 ? 'text-amber-800 font-medium' : 'text-neutral-600'
              }`}
            >
              {t('signup.otp_window', {
                minutes: Math.floor(secondsLeft / 60),
                seconds: String(secondsLeft % 60).padStart(2, '0'),
              })}
            </Text>
          </View>
        ) : null}

        {/* Form fields — minimal: nama, gender, cabang */}
        <View className="bg-white rounded-2xl p-4 gap-3 border border-neutral-100">
          <TextField
            label={t('signup.full_name')}
            placeholder={t('signup.full_name_placeholder')}
            value={namaLengkap}
            onChangeText={(v) => {
              setField('namaLengkap', v);
              setErrors((e) => ({ ...e, namaLengkap: undefined }));
            }}
            error={errors.namaLengkap}
            editable={!mutation.isPending}
          />

          <SegmentedControl<'L' | 'P'>
            label={t('signup.gender')}
            value={jenisKelamin as 'L' | 'P' | ''}
            options={[
              { value: 'L', label: t('signup.gender_male') },
              { value: 'P', label: t('signup.gender_female') },
            ]}
            onChange={(v) => {
              setField('jenisKelamin', v);
              setErrors((e) => ({ ...e, jenisKelamin: undefined }));
            }}
          />
          {errors.jenisKelamin ? (
            <Text className="text-xs text-red-600 -mt-2">{errors.jenisKelamin}</Text>
          ) : null}

          <Picker
            label={t('signup.branch')}
            placeholder={
              branchesQuery.isPending
                ? t('signup.branch_loading')
                : branchesQuery.isError
                ? t('signup.branch_error')
                : t('signup.branch_placeholder')
            }
            value={cabangId}
            options={branchOptions}
            onChange={(v) => {
              setField('cabangId', v);
              setErrors((e) => ({ ...e, cabangId: undefined }));
            }}
            error={errors.cabangId}
            modalTitle={t('signup.branch_modal_title')}
          />
          {branchesQuery.isError ? (
            <Text
              className="text-xs text-brand-600 font-semibold -mt-2"
              onPress={() => branchesQuery.refetch()}
            >
              {t('common.retry')}
            </Text>
          ) : null}
        </View>

        <View className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex-row gap-2">
          <Info size={16} color="#1d4ed8" />
          <Text className="text-xs text-blue-800 flex-1">{t('signup.minimal_notice')}</Text>
        </View>

        <View className="mt-3 mb-6 p-3 bg-brand-50 border border-brand-100 rounded-xl flex-row gap-2">
          <Info size={16} color="#EA580C" />
          <Text className="text-xs text-brand-800 flex-1">{t('signup.auto_active_notice')}</Text>
        </View>
      </ScrollView>

      <View className="px-5 py-3 border-t bg-white border-neutral-100">
        <Button
          label={t('signup.submit')}
          onPress={submit}
          loading={mutation.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
