import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { DateField } from '@/components/ui/DateField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Picker } from '@/components/ui/Picker';
import { register } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useSignupStore } from '@/stores/signup.store';
import { useBranches } from '@/hooks/useBranches';
import { ApiError } from '@/types/api';

type FieldErrors = Partial<{
  namaLengkap: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  cabangId: string;
}>;

function validateDate(s: string): boolean {
  // YYYY-MM-DD format check + valid Date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && d <= new Date();
}

export default function SignupDataScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  // Get state via individual selectors untuk reactivity
  const noHp = useSignupStore((s) => s.noHp);
  const namaLengkap = useSignupStore((s) => s.namaLengkap);
  const tanggalLahir = useSignupStore((s) => s.tanggalLahir);
  const jenisKelamin = useSignupStore((s) => s.jenisKelamin);
  const alamat = useSignupStore((s) => s.alamat);
  const cabangId = useSignupStore((s) => s.cabangId);
  const setField = useSignupStore((s) => s.setField);
  const reset = useSignupStore((s) => s.reset);

  const [errors, setErrors] = useState<FieldErrors>({});

  const branchesQuery = useBranches();

  const mutation = useMutation({
    mutationFn: async () =>
      register({
        noHp,
        namaLengkap,
        tanggalLahir,
        jenisKelamin: jenisKelamin as 'L' | 'P',
        alamat,
        cabangId,
      }),
    onSuccess: async (data) => {
      // Save tokens + user, lalu navigate ke success
      await login(data.accessToken, data.refreshToken, data.user);
      router.replace('/(auth)/signup/success');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details?.fieldErrors) {
          const fe = err.details.fieldErrors;
          setErrors({
            namaLengkap: fe.namaLengkap?.[0],
            tanggalLahir: fe.tanggalLahir?.[0],
            jenisKelamin: fe.jenisKelamin?.[0],
            alamat: fe.alamat?.[0],
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
    if (!tanggalLahir || !validateDate(tanggalLahir)) next.tanggalLahir = t('signup.error_date_invalid');
    if (!jenisKelamin) next.jenisKelamin = t('signup.error_gender_required');
    if (!alamat || alamat.length < 5) next.alamat = t('signup.error_address_required');
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
        <Text className="text-neutral-500 text-sm mb-5">{t('signup.data_sub')}</Text>

        {/* Form fields */}
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

          <DateField
            label={t('signup.dob')}
            placeholder={t('signup.dob_placeholder')}
            value={tanggalLahir}
            onChange={(v) => {
              setField('tanggalLahir', v);
              setErrors((e) => ({ ...e, tanggalLahir: undefined }));
            }}
            error={errors.tanggalLahir}
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

          <TextField
            label={t('signup.address')}
            placeholder={t('signup.address_placeholder')}
            value={alamat}
            onChangeText={(v) => {
              setField('alamat', v);
              setErrors((e) => ({ ...e, alamat: undefined }));
            }}
            error={errors.alamat}
            multiline
            numberOfLines={3}
            editable={!mutation.isPending}
          />

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

        <View className="mt-4 mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl flex-row gap-2">
          <Info size={16} color="#1d4ed8" />
          <Text className="text-xs text-blue-800 flex-1">{t('signup.auto_active_notice')}</Text>
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
