import { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar as CalendarIcon, Camera, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getMyProfile, updateMyProfile, uploadMyFoto } from '@/api/me';
import {
  updateDependentProfile,
  uploadDependentFoto,
} from '@/api/family';
import { useMyFamily } from '@/hooks/useFamily';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { env } from '@/config/env';
import { formatPhoneDisplay } from '@/utils/phone';

/**
 * Edit Profile — form untuk update /admin/me ATAU update dependent family member.
 *
 * Mode "self" (default) → PATCH /admin/me + POST /admin/me/foto
 * Mode "dependent" (?dependent=<jemaatId>) → PATCH /admin/me/family/:id/profile
 *   + POST /admin/me/family/:id/foto. Per BE patch 2026-05-22a.
 *
 * Dalam dependent mode, hide phone + email fields (dependent tidak punya kedua-nya).
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ dependent?: string }>();
  const dependentId = params.dependent;
  const isDependent = !!dependentId;
  const showToast = useToast((s) => s.show);
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const meQuery = useQuery({
    queryKey: ['me', 'edit'],
    queryFn: getMyProfile,
    enabled: !isDependent,
  });

  const familyQuery = useMyFamily();

  // Resolve source data — self vs dependent
  const sourceJemaat = useMemo(() => {
    if (isDependent) {
      const match = (familyQuery.data ?? []).find(
        (r) => r.jemaat.id === dependentId,
      );
      return match
        ? {
            id: match.jemaat.id,
            namaLengkap: match.jemaat.namaLengkap,
            email: null as string | null,
            alamat: null as string | null,
            tanggalLahir: match.jemaat.tanggalLahir ?? null,
            jenisKelamin: match.jemaat.jenisKelamin ?? null,
            fotoUrl: match.jemaat.fotoUrl ?? null,
            noHp: null as string | null,
          }
        : null;
    }
    return meQuery.data
      ? {
          id: meQuery.data.id,
          namaLengkap: meQuery.data.namaLengkap,
          email: meQuery.data.email ?? null,
          alamat: meQuery.data.alamat ?? null,
          tanggalLahir: meQuery.data.tanggalLahir ?? null,
          jenisKelamin: meQuery.data.jenisKelamin ?? null,
          fotoUrl: meQuery.data.fotoUrl ?? null,
          noHp: meQuery.data.noHp ?? null,
        }
      : null;
  }, [isDependent, dependentId, familyQuery.data, meQuery.data]);

  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (sourceJemaat) {
      setNamaLengkap(sourceJemaat.namaLengkap ?? '');
      setEmail(sourceJemaat.email ?? '');
      setAlamat(sourceJemaat.alamat ?? '');
      setDob(sourceJemaat.tanggalLahir ? new Date(sourceJemaat.tanggalLahir) : null);
      setJenisKelamin((sourceJemaat.jenisKelamin as 'L' | 'P' | null) ?? '');
    }
  }, [sourceJemaat]);

  const fotoUrl = sourceJemaat?.fotoUrl ?? (isDependent ? null : user?.fotoUrl) ?? null;

  const updateMutation = useMutation<{ namaLengkap: string }>({
    mutationFn: async () => {
      const tanggalLahir = dob ? dob.toISOString().slice(0, 10) : undefined;
      if (isDependent) {
        const r = await updateDependentProfile(dependentId!, {
          namaLengkap: namaLengkap.trim() || undefined,
          alamat: alamat.trim() || undefined,
          tanggalLahir,
          jenisKelamin: jenisKelamin || undefined,
        });
        return { namaLengkap: r.namaLengkap };
      }
      const r = await updateMyProfile({
        namaLengkap: namaLengkap.trim() || undefined,
        email: email.trim() || undefined,
        alamat: alamat.trim() || undefined,
        tanggalLahir,
        jenisKelamin: jenisKelamin || undefined,
      });
      return { namaLengkap: r.namaLengkap };
    },
    onSuccess: async (profile) => {
      if (!isDependent && user) {
        await setUser({ ...user, namaLengkap: profile.namaLengkap });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['family'] });
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
      const fileObj = { uri: asset.uri, name: filename, type: mime };
      if (isDependent) {
        return uploadDependentFoto(dependentId!, fileObj);
      }
      return uploadMyFoto(fileObj);
    },
    onSuccess: async (data) => {
      if (!isDependent && user) {
        await setUser({ ...user, fotoUrl: data.fotoUrl });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['family'] });
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
      mediaTypes: ['images'],
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
            {isDependent
              ? t('edit_profile.title_dependent', {
                  name: sourceJemaat?.namaLengkap ?? '—',
                })
              : t('profile.edit_profile')}
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

          {/* Self mode: phone readonly + email editable.
              Dependent mode: phone+email hidden sampai BE extend endpoint
              support (lihat docs/backend-request-dependent-edit-fuller.md).
              Sementara guardian bisa request phone update via admin cabang. */}
          {!isDependent ? (
            <>
              <Field label={t('edit_profile.phone')}>
                <View className="bg-neutral-100 rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between">
                  <Text className="text-base text-neutral-900">
                    {sourceJemaat?.noHp ? formatPhoneDisplay(sourceJemaat.noHp) : '—'}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {t('edit_profile.phone_readonly')}
                  </Text>
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
            </>
          ) : (
            <View className="bg-amber-50 rounded-xl p-3 border border-amber-100 mb-4">
              <Text className="text-xs text-amber-800 leading-relaxed">
                {t('edit_profile.dependent_phone_pending')}
              </Text>
            </View>
          )}

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
    textColor?: string;
    themeVariant?: 'light' | 'dark';
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
            textColor?: string;
            themeVariant?: 'light' | 'dark';
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
            textColor="#171717"
            themeVariant="light"
            onChange={(_e, d) => {
              if (d) onChange(d);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
