import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar as CalendarIcon, Info, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { invalidPhoneMessage, normalizePhone } from '@/utils/phone';
import { TipeRelasiPicker } from '@/components/family/TipeRelasiPicker';
import { useToast } from '@/components/ui/Toast';
import { useRegisterNewFamily } from '@/hooks/useFamily';
import { ApiError } from '@/types/api';
import type { TipeRelasi } from '@/types/tipeRelasi';
import { goBack } from '@/utils/nav';
import { parseLocalDate, toIsoDate } from '@/utils/date';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { cekNama, cekTanggalLahir, pertamaGagal } from '@/utils/inputRules';

export default function FamilyAddNewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [nama, setNama] = useState('');
  // Kontak opsional (2026-12): diisi → anggota bisa masuk sendiri; kosong → tanggungan.
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [namaError, setNamaError] = useState<string | null>(null);
  const [gender, setGender] = useState<'L' | 'P' | null>(null);
  const [tipe, setTipe] = useState<TipeRelasi | null>(null);
  const [tanggalLahir, setTanggalLahir] = useState<string>(''); // ISO YYYY-MM-DD, '' = belum diisi
  const [showDatePicker, setShowDatePicker] = useState(false);
  const showToast = useToast((s) => s.show);
  const registerMutation = useRegisterNewFamily();

  function handleSubmit() {
    setNamaError(null);
    if (!nama.trim()) {
      setNamaError(t('family.nama_required'));
      return;
    }
    const salah = pertamaGagal(cekNama(nama), tanggalLahir ? cekTanggalLahir(new Date(`${tanggalLahir}T12:00:00`)) : null);
    if (salah) {
      setNamaError(salah);
      return;
    }
    if (!tipe) return;
    setPhoneError(null);
    setEmailError(null);
    let noHp: string | null = null;
    if (phone.trim()) {
      noHp = normalizePhone(phone);
      if (!noHp) {
        setPhoneError(invalidPhoneMessage(phone, i18n.language === 'en' ? 'en' : 'id'));
        return;
      }
    }
    const em = email.trim().toLowerCase();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
      setEmailError(t('signup.email_invalid'));
      return;
    }
    registerMutation.mutate(
      {
        namaLengkap: nama.trim(),
        tipeRelasiId: tipe.id,
        jenisKelamin: gender,
        tanggalLahir: tanggalLahir || null,
        // Tanpa nomor & email → tanggungan (dikelola wali).
        noHp,
        email: em || null,
      },
      {
        onSuccess: (data) => {
          showToast(
            t('family.register_new_success', { name: data.jemaat.namaLengkap }),
            'success',
          );
          router.replace('/family');
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'CONFLICT') {
            if (/email/i.test(err.message)) setEmailError(err.message);
            else setPhoneError(err.message);
          } else if (err instanceof ApiError) {
            Alert.alert(t('error.generic'), err.message);
          } else {
            Alert.alert(t('error.network'));
          }
        },
      },
    );
  }

  const submitDisabled = !nama.trim() || !tipe;

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
      <KeyboardSafeView
        className="flex-1"
      >
        <View className="px-4 py-2 flex-row items-center border-b border-neutral-100">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('family.add_via_new')}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex-row gap-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
              <UserPlus size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-emerald-900">
                {t('family.add_new_title')}
              </Text>
              <Text className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                {t('family.add_new_intro')}
              </Text>
            </View>
          </View>

          <TextField
            label={t('family.nama_lengkap')}
            placeholder={t('family.nama_placeholder')}
            value={nama}
            onChangeText={(v) => {
              setNama(v);
              setNamaError(null);
            }}
            error={namaError ?? undefined}
            editable={!registerMutation.isPending}
          />

          <View className="mt-4">
            <Text className="text-xs font-medium text-neutral-600 mb-2">
              {t('family.gender_label')}
            </Text>
            <View className="flex-row gap-2">
              {(['L', 'P'] as const).map((g) => {
                const active = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    {...gx(`flex-1 py-3 rounded-xl border ${
                      active ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'
                    }`)}
                  >
                    <Text
                      className={`text-sm font-semibold text-center ${
                        active ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      {g === 'L' ? t('family.gender_male') : t('family.gender_female')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tanggal lahir — optional, penting untuk anak dependent (age gate,
              kids ibadah eligibility, dll) */}
          <View className="mt-5">
            <Text className="text-xs font-medium text-neutral-600 mb-1">
              {t('family.dob_label')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              disabled={registerMutation.isPending}
              className="px-3 py-3 border rounded-lg flex-row items-center justify-between border-neutral-200"
            >
              <Text
                className={`text-sm ${
                  tanggalLahir ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {tanggalLahir || t('family.dob_placeholder')}
              </Text>
              <CalendarIcon size={18} color={nc('#737373')} />
            </Pressable>
            <Text className="text-xs text-neutral-500 mt-1">
              {t('family.dob_helper')}
            </Text>
          </View>

          <View className="mt-5">
            <TipeRelasiPicker
              value={tipe}
              onChange={setTipe}
              disabled={registerMutation.isPending}
            />
          </View>

          {/* Kontak opsional — untuk anggota dewasa yang ingin masuk sendiri. */}
          <View className="mt-5 rounded-2xl border border-neutral-200 p-4">
            <Text className="text-sm font-semibold text-neutral-900">{t('family.contact_title')}</Text>
            <Text className="text-xs text-neutral-500 mt-0.5 mb-3 leading-4">{t('family.contact_sub')}</Text>
            <PhoneInput
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setPhoneError(null);
              }}
              label={t('family.phone_label_opt')}
              error={phoneError ?? undefined}
              editable={!registerMutation.isPending}
            />
            <View className="mt-3">
              <TextField
                label={t('family.email_label_opt')}
                placeholder="nama@email.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setEmailError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError ?? undefined}
                editable={!registerMutation.isPending}
              />
            </View>
          </View>

          <View className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex-row gap-2">
            <Info size={16} color={nc('#92400e')} />
            <Text className="text-xs text-amber-800 flex-1">
              {phone.trim() || email.trim() ? t('family.contact_notice') : t('family.dependent_notice')}
            </Text>
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-card border-t border-neutral-100">
          <Button
            label={t('family.register_new_btn')}
            onPress={handleSubmit}
            loading={registerMutation.isPending}
            disabled={submitDisabled}
            fullWidth
            size="lg"
            leftIcon={<UserPlus size={16} color="#fff" />}
          />
        </View>
      </KeyboardSafeView>

      {showDatePicker ? (
        <DatePickerModal
          value={tanggalLahir ? parseLocalDate(tanggalLahir) : new Date(2010, 0, 1)}
          onChange={(d) => setTanggalLahir(toIsoDate(d))}
          onClose={() => setShowDatePicker(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
