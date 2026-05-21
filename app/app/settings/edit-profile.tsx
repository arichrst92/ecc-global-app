import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getMyProfile, updateMyProfile } from '@/api/me';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';

/**
 * Edit Profile — form untuk update field di /admin/me.
 * Fields: nama, email, alamat, tanggal lahir, jenis kelamin.
 *
 * Foto upload + ganti cabang ada di screen terpisah (cabang via
 * change-branch screen, foto via upload modal di profile tab nanti).
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const meQuery = useQuery({
    queryKey: ['me', 'edit'],
    queryFn: getMyProfile,
  });

  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');

  useEffect(() => {
    if (meQuery.data) {
      setNamaLengkap(meQuery.data.namaLengkap ?? '');
      setEmail(meQuery.data.email ?? '');
      setAlamat(meQuery.data.alamat ?? '');
      setTanggalLahir(meQuery.data.tanggalLahir?.slice(0, 10) ?? '');
      setJenisKelamin((meQuery.data.jenisKelamin as 'L' | 'P' | null) ?? '');
    }
  }, [meQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        namaLengkap: namaLengkap.trim() || undefined,
        email: email.trim() || undefined,
        alamat: alamat.trim() || undefined,
        tanggalLahir: tanggalLahir || undefined,
        jenisKelamin: jenisKelamin || undefined,
      }),
    onSuccess: async (profile) => {
      if (user) {
        await setUser({ ...user, namaLengkap: profile.namaLengkap });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      showToast(t('edit_profile.success'), 'success');
      router.back();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('profile.edit_profile')}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Field label={t('edit_profile.full_name')}>
            <TextInput
              value={namaLengkap}
              onChangeText={setNamaLengkap}
              placeholder={t('signup.full_name_placeholder')}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          <Field label={t('edit_profile.email')}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          <Field label={t('signup.gender')}>
            <View className="flex-row gap-2">
              {(['L', 'P'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setJenisKelamin(g)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    jenisKelamin === g
                      ? 'bg-brand-50 border-brand-500'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      jenisKelamin === g ? 'text-brand-700' : 'text-neutral-700'
                    }`}
                  >
                    {g === 'L' ? t('signup.gender_male') : t('signup.gender_female')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('edit_profile.dob')}>
            <TextInput
              value={tanggalLahir}
              onChangeText={setTanggalLahir}
              placeholder="YYYY-MM-DD"
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
            <Text className="text-xs text-neutral-400 mt-1">
              {t('edit_profile.dob_helper')}
            </Text>
          </Field>

          <Field label={t('signup.address')}>
            <TextInput
              value={alamat}
              onChangeText={setAlamat}
              placeholder={t('signup.address_placeholder')}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[80px]"
            />
          </Field>

          <Text className="text-xs text-neutral-400 mt-2 leading-relaxed">
            {t('edit_profile.notice')}
          </Text>
        </ScrollView>

        {/* Save button */}
        <View className="px-5 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('common.save')}
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      {children}
    </View>
  );
}
