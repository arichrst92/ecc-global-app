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
import { invalidPhoneMessage, formatPhoneDisplay, normalizePhone } from '@/utils/phone';
import { goBack } from '@/utils/nav';
import { ChangePhoneModal } from '@/components/profile/ChangePhoneModal';
import { PEKERJAAN_OPTIONS, PERNIKAHAN_OPTIONS } from '@/constants/profileOptions';
import { WebDatePickerModal } from '@/components/ui/WebDatePickerModal';
import { parseLocalDate, toIsoDate } from '@/utils/date';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

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
  const { t, i18n } = useTranslation();
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
            statusPekerjaan: null as string | null,
            namaKantor: null as string | null,
            statusPernikahan: null as string | null,
            tanggalPernikahan: null as string | null,
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
          statusPekerjaan: meQuery.data.statusPekerjaan ?? null,
          namaKantor: meQuery.data.namaKantor ?? null,
          statusPernikahan: meQuery.data.statusPernikahan ?? null,
          tanggalPernikahan: meQuery.data.tanggalPernikahan ?? null,
        }
      : null;
  }, [isDependent, dependentId, familyQuery.data, meQuery.data]);

  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHpInput, setNoHpInput] = useState(''); // dependent mode only — user input raw, normalize on submit
  const [dob, setDob] = useState<Date | null>(null);
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pekerjaan, setPekerjaan] = useState('');
  const [namaKantor, setNamaKantor] = useState('');
  const [pernikahan, setPernikahan] = useState('');
  const [tglNikah, setTglNikah] = useState<Date | null>(null);
  const [showNikahPicker, setShowNikahPicker] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  useEffect(() => {
    if (sourceJemaat) {
      setNamaLengkap(sourceJemaat.namaLengkap ?? '');
      setEmail(sourceJemaat.email ?? '');
      setAlamat(sourceJemaat.alamat ?? '');
      setNoHpInput(sourceJemaat.noHp ?? '');
      setDob(sourceJemaat.tanggalLahir ? parseLocalDate(sourceJemaat.tanggalLahir) : null);
      setJenisKelamin((sourceJemaat.jenisKelamin as 'L' | 'P' | null) ?? '');
      setPekerjaan(sourceJemaat.statusPekerjaan ?? '');
      setNamaKantor(sourceJemaat.namaKantor ?? '');
      setPernikahan(sourceJemaat.statusPernikahan ?? '');
      setTglNikah(sourceJemaat.tanggalPernikahan ? parseLocalDate(sourceJemaat.tanggalPernikahan) : null);
    }
  }, [sourceJemaat]);

  const fotoUrl = sourceJemaat?.fotoUrl ?? (isDependent ? null : user?.fotoUrl) ?? null;

  const updateMutation = useMutation<{ namaLengkap: string; noHpAdded?: boolean }>({
    mutationFn: async () => {
      const tanggalLahir = dob ? toIsoDate(dob) : undefined;
      if (isDependent) {
        // Normalize phone: kalau user kosongin → null (clear), kalau diisi →
        // normalize ke E.164 atau throw kalau format invalid.
        const noHpTrim = noHpInput.trim();
        let noHpPayload: string | null | undefined;
        if (noHpTrim === '') {
          noHpPayload = sourceJemaat?.noHp ? null : undefined; // clear vs skip
        } else {
          const normalized = normalizePhone(noHpTrim);
          if (!normalized) {
            throw new ApiError(
              { code: 'VALIDATION_ERROR', message: invalidPhoneMessage(noHpTrim, i18n.language === 'en' ? 'en' : 'id') },
              400,
            );
          }
          noHpPayload = normalized;
        }
        const wasNoHpEmpty = !sourceJemaat?.noHp;
        const noHpAdded = wasNoHpEmpty && typeof noHpPayload === 'string';

        const r = await updateDependentProfile(dependentId!, {
          namaLengkap: namaLengkap.trim() || undefined,
          alamat: alamat.trim() || undefined,
          tanggalLahir,
          jenisKelamin: jenisKelamin || undefined,
          noHp: noHpPayload,
          email: email.trim() ? email.trim() : (sourceJemaat?.email ? null : undefined),
        });
        return { namaLengkap: r.namaLengkap, noHpAdded };
      }
      const r = await updateMyProfile({
        namaLengkap: namaLengkap.trim() || undefined,
        email: email.trim() || undefined,
        alamat: alamat.trim() || undefined,
        tanggalLahir,
        jenisKelamin: jenisKelamin || undefined,
        // Kosong = hapus (null)
        statusPekerjaan: pekerjaan.trim() || null,
        namaKantor: namaKantor.trim() || null,
        statusPernikahan: pernikahan || null,
        tanggalPernikahan: pernikahan && pernikahan !== 'Single' && tglNikah ? toIsoDate(tglNikah) : null,
      });
      return { namaLengkap: r.namaLengkap };
    },
    onSuccess: async (profile) => {
      if (!isDependent && user) {
        await setUser({ ...user, namaLengkap: profile.namaLengkap });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['family'] });
      // Special toast kalau dependent baru di-promote (first noHp set) —
      // mereka sekarang bisa login mandiri dengan OTP
      const successKey =
        profile.noHpAdded ? 'edit_profile.dependent_promoted' : 'edit_profile.success';
      showToast(t(successKey, { name: profile.namaLengkap }), 'success');
      goBack(router);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        // 409 CONFLICT — uniqueness check failed (noHp/email duplicate).
        // BE message sudah mention nama jemaat lain — surface directly.
        showToast(err.message, 'error');
      } else {
        showToast(t('error.network'), 'error');
      }
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
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
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
              <View {...gx('absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 items-center justify-center border-2 border-white')}>
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
              className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
            />
          </Field>

          {/* Phone + Email — pattern berbeda per mode.
              Self: phone readonly (harus ganti via OTP flow), email editable.
              Dependent (BE patch 22c): phone + email editable. Kalau noHp
              di-tambahkan pertama kali, jemaat auto-promoted jadi full member
              (bisa login mandiri). */}
          {!isDependent ? (
            <>
              <Field label={t('edit_profile.phone')}>
                <Pressable
                  onPress={() => setPhoneOpen(true)}
                  className="bg-neutral-100 rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between"
                >
                  <Text className="text-base text-neutral-900">
                    {sourceJemaat?.noHp ? formatPhoneDisplay(sourceJemaat.noHp) : '—'}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Pencil size={13} color="#EA580C" />
                    <Text className="text-xs font-semibold text-brand-600">{t('change_phone.btn')}</Text>
                  </View>
                </Pressable>
                <Text className="text-[10px] text-neutral-500 mt-1">{t('change_phone.field_hint')}</Text>
              </Field>

              <Field label={t('edit_profile.email')}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nama@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('edit_profile.phone')}>
                <TextInput
                  value={noHpInput}
                  onChangeText={setNoHpInput}
                  placeholder="0821xxx atau +65 9123xxxx"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
                />
                <Text className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                  {sourceJemaat?.noHp
                    ? t('edit_profile.dependent_phone_helper_existing')
                    : t('edit_profile.dependent_phone_helper_empty')}
                </Text>
              </Field>

              <Field label={t('edit_profile.email')}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nama@email.com (opsional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
                />
              </Field>
            </>
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
                      : 'bg-card border-neutral-200'
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
              className="bg-card rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between"
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
              <CalendarIcon size={18} color={nc('#737373')} />
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
              className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[80px]"
            />
          </Field>

          {!isDependent ? (
            <>
              <Field label={t('edit_profile.job')}>
                <ChipSelect
                  options={PEKERJAAN_OPTIONS}
                  value={pekerjaan}
                  onChange={setPekerjaan}
                  labelFor={(v) => t(`edit_profile.job_opt.${v}`, { defaultValue: v })}
                />
                <TextInput
                  value={namaKantor}
                  onChangeText={setNamaKantor}
                  placeholder={t('edit_profile.office_placeholder')}
                  className="mt-2 bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
                />
              </Field>

              <Field label={t('edit_profile.marriage')}>
                <ChipSelect
                  options={PERNIKAHAN_OPTIONS}
                  value={pernikahan}
                  onChange={setPernikahan}
                  labelFor={(v) => t(`edit_profile.marriage_opt.${v}`, { defaultValue: v })}
                />
                {pernikahan && pernikahan !== 'Single' ? (
                  <Pressable
                    onPress={() => setShowNikahPicker(true)}
                    className="mt-2 bg-card rounded-xl px-4 py-3 border border-neutral-200 flex-row items-center justify-between"
                  >
                    <Text className={`text-base ${tglNikah ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      {tglNikah
                        ? tglNikah.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                        : t('edit_profile.marriage_date_placeholder')}
                    </Text>
                    <CalendarIcon size={18} color={nc('#737373')} />
                  </Pressable>
                ) : null}
              </Field>
              <Text className="text-[11px] text-neutral-500 -mt-1 mb-2">{t('edit_profile.privacy_hint')}</Text>
            </>
          ) : null}
        </ScrollView>

        {/* Save button — SafeAreaView bottom supaya tidak overlap home indicator */}
        <SafeAreaView edges={['bottom']} className="bg-card border-t border-neutral-100">
          <View className="px-5 pt-3 pb-3">
            <Button
              label={t('common.save')}
              onPress={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Date picker modal — lazy import @react-native-community/datetimepicker */}
      {showDatePicker ? (
        <DatePickerModal
          value={dob ?? new Date(2000, 0, 1)}
          onChange={(d) => setDob(d)}
          onClose={() => setShowDatePicker(false)}
        />
      ) : null}
      {showNikahPicker ? (
        <DatePickerModal
          value={tglNikah ?? new Date(2010, 0, 1)}
          onChange={(d) => setTglNikah(d)}
          onClose={() => setShowNikahPicker(false)}
        />
      ) : null}

      {!isDependent ? (
        <ChangePhoneModal
          visible={phoneOpen}
          currentNoHp={sourceJemaat?.noHp ?? null}
          onClose={() => setPhoneOpen(false)}
          onChanged={async (noHp) => {
            setPhoneOpen(false);
            if (user) await setUser({ ...user, noHp });
            await qc.invalidateQueries({ queryKey: ['me'] });
            showToast(t('change_phone.success'), 'success');
          }}
        />
      ) : null}
    </View>
  );
}

/** Pilihan berbentuk chip; nilai lama di luar daftar tetap tampil & terpilih. */
function ChipSelect({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  labelFor: (v: string) => string;
}) {
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <View className="flex-row flex-wrap gap-2">
      {all.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(on ? '' : o)}
            className={`px-3 py-2 rounded-full border ${on ? 'bg-brand-50 border-brand-500' : 'bg-card border-neutral-200'}`}
          >
            <Text className={`text-xs font-semibold ${on ? 'text-brand-700' : 'text-neutral-700'}`}>{labelFor(o)}</Text>
          </Pressable>
        );
      })}
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
    // Web: ditangani WebDatePickerModal (input tanggal browser).
    if (Platform.OS === 'web') return;
    (async () => {
      try {
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

  if (Platform.OS === 'web') {
    return <WebDatePickerModal value={value} onChange={onChange} onClose={onClose} />;
  }
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
          className="bg-card w-full rounded-t-3xl pt-4 pb-8 px-4"
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
            textColor={nc('#171717')}
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
