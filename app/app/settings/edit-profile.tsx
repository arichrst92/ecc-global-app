import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { ArrowLeft, Calendar as CalendarIcon, Camera, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getMyProfile, updateMyProfile, uploadMyFoto } from '@/api/me';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { env } from '@/config/env';
import { formatPhoneDisplay } from '@/utils/phone';

/**
 * Edit Profile — form lengkap untuk update /admin/me.
 * Fields: foto (upload), nama, email, gender, date of birth (date picker),
 * alamat. NoHp readonly (hanya bisa diganti via OTP flow).
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
  const [dob, setDob] = useState<Date | null>(null);
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (meQuery.data) {
      setNamaLengkap(meQuery.data.namaLengkap ?? '');
      setEmail(meQuery.data.email ?? '');
      setAlamat(meQuery.data.alamat ?? '');
      setDob(meQuery.data.tanggalLahir ? new Date(meQuery.data.tanggalLahir) : null);
      setJenisKelamin((meQuery.data.jenisKelamin as 'L' | 'P' | null) ?? '');
    }
  }, [meQuery.data]);

  const fotoUrl = meQuery.data?.fotoUrl ?? user?.fotoUrl ?? null;

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        namaLengkap: namaLengkap.trim() || undefined,
        email: email.trim() || undefined,
        alamat: alamat.trim() || undefined,
        tanggalLahir: dob ? dob.toISOString().slice(0, 10) : undefined,
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

  const fotoMutation = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const filename = asset.uri.split('/').pop() ?? 'foto.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return uploadMyFoto({ uri: asset.uri, name: filename, type: mime });
    },
    onSuccess: async (data) => {
      if (user) await setUser({ ...user, fotoUrl: data.fotoUrl });
      await qc.invalidateQueries({ queryKey: ['me'] });
      showToast(t('edit_profile.foto_uploaded'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

  async function pickFoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(t('edit_profile.foto_permission'), 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      fotoMutation.mutate(result.assets[0]);
    }
  }

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
          {/* Foto upload */}
          <View className="items-center mb-5">
            <Pressable onPress={pickFoto} className="relative">
              {fotoUrl ? (
                <Image
                  source={{
                    uri: fotoUrl.startsWith('http') ? fotoUrl : `${env.apiBaseUrl}${fotoUrl}`,
                  }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <Avatar
                  name={namaLengkap || user?.namaLengkap || '—'}
                  size={96}
                  className="bg-brand-100"
                />
              )}
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 items-center justify-center border-2 border-white">
                <Camera size={14} color="#fff" />
              </View>
            </Pressable>
            {fotoMutation.isPending ? (
              <Text className="text-xs text-neutral-500 mt-2">
                {t('common.loading')}
              </Text>
            ) : (
              <Text className="text-xs text-neutral-500 mt-2">
                {t('edit_profile.tap_to_change_foto')}
              </Text>
            )}
          </View>

          <Field label={t('edit_profile.full_name')}>
            <TextInput
              value={namaLengkap}
              onChangeText={setNamaLengkap}
              placeholder={t('signup.full_name_placeholder')}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          <Field label={t('edit_profile.phone')}>
            <View className="bg-neutral-100 rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between">
              <Text className="text-base text-neutral-900">
                {meQuery.data?.noHp ? formatPhoneDisplay(meQuery.data.noHp) : '—'}
              </Text>
              <Text className="text-xs text-neutral-500">{t('edit_profile.phone_readonly')}</Text>
            </View>
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
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-white rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between"
            >
              <Text
                className={`text-base ${dob ? 'text-neutral-900' : 'text-neutral-400'}`}
              >
                {dob ? dob.toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }) : t('edit_profile.dob_placeholder')}
              </Text>
              <CalendarIcon size={18} color="#737373" />
            </Pressable>
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
        </ScrollView>

        {/* Save button */}
        <View className="px-5 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('common.save')}
            onPress={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Date picker modal — lazy import @react-native-community/datetimepicker */}
      {showDatePicker ? (
        <DatePickerModal
          value={dob ?? new Date(2000, 0, 1)}
          onChange={(d) => setDob(d)}
          onClose={() => setShowDatePicker(false)}
        />
      ) : null}
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

/**
 * DatePickerModal — wrapper @react-native-community/datetimepicker.
 * iOS: spinner inline modal. Android: native dialog auto-dismiss.
 * Lazy-load library supaya web build tidak crash.
 */
function DatePickerModal({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [DateTimePicker, setMod] = useState<React.ComponentType<{
    value: Date;
    mode: 'date';
    display: 'spinner' | 'default';
    maximumDate?: Date;
    minimumDate?: Date;
    onChange: (event: unknown, date?: Date) => void;
  }> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      onClose();
      return;
    }
    (async () => {
      try {
        // @ts-ignore — lazy import; module resolved at runtime after `npm install`
        const mod = (await import('@react-native-community/datetimepicker')) as unknown as {
          default: React.ComponentType<{
            value: Date;
            mode: 'date';
            display: 'spinner' | 'default';
            maximumDate?: Date;
            minimumDate?: Date;
            onChange: (event: unknown, date?: Date) => void;
          }>;
        };
        setMod(() => mod.default);
      } catch {
        onClose();
      }
    })();
  }, [onClose]);

  if (!DateTimePicker) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
        onChange={(_e, d) => {
          if (d) onChange(d);
          onClose();
        }}
      />
    );
  }

  // iOS: spinner inline di modal
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 items-center justify-end"
      >
        <Pressable
          onPress={() => {}}
          className="bg-white w-full rounded-t-3xl pt-4 pb-8 px-4"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Pressable onPress={onClose}>
              <Text className="text-sm text-neutral-500 px-2 py-1">Batal</Text>
            </Pressable>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-bold text-brand-600 px-2 py-1">OK</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            onChange={(_e, d) => {
              if (d) onChange(d);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
