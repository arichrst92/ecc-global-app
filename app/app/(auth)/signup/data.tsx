import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar as CalendarIcon, Info, Clock, UserSearch, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Picker } from '@/components/ui/Picker';
import { register, registerMatch, requestClaimOtp } from '@/api/auth';
import { OtpInput } from '@/components/ui/OtpInput';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SpamHint } from '@/components/auth/SpamHint';
import { parseLocalDate, toIsoDate, formatDate } from '@/utils/date';
import { useAuthStore } from '@/stores/auth.store';
import { useSignupStore } from '@/stores/signup.store';
import { useBranches } from '@/hooks/useBranches';
import { ApiError } from '@/types/api';
import type { JenisJemaat, RegisterMatch, RegisterMatchPayload } from '@/types/auth';
import { nc } from '@/theme/ThemeRoot';
import { buildConsentPayload } from '@/api/consent';
import { ConsentChecklist, EMPTY_CONSENT, isConsentComplete, type ConsentValue } from '@/features/consent/ConsentChecklist';
import { cekNama, cekTanggalLahir } from '@/utils/inputRules';

type FieldErrors = Partial<{
  namaLengkap: string;
  jenisKelamin: string;
  cabangId: string;
  jenisJemaat: string;
  consent: string;
  tanggalLahir: string;
}>;

export default function SignupDataScreen() {
  const { t, i18n } = useTranslation();
  const [consent, setConsent] = useState<ConsentValue>(EMPTY_CONSENT);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  // Get state via individual selectors untuk reactivity
  const channel = useSignupStore((s) => s.channel);
  const noHp = useSignupStore((s) => s.noHp);
  const signupEmail = useSignupStore((s) => s.email);
  const tanggalLahir = useSignupStore((s) => s.tanggalLahir);
  const namaLengkap = useSignupStore((s) => s.namaLengkap);
  const jenisKelamin = useSignupStore((s) => s.jenisKelamin);
  const cabangId = useSignupStore((s) => s.cabangId);
  const jenisJemaat = useSignupStore((s) => s.jenisJemaat);
  const otpVerifiedExpiresAt = useSignupStore((s) => s.otpVerifiedExpiresAt);
  const setField = useSignupStore((s) => s.setField);
  const reset = useSignupStore((s) => s.reset);


  const [errors, setErrors] = useState<FieldErrors>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showDob, setShowDob] = useState(false);
  /** Data jemaat lama yang mungkin milik pendaftar (hasil /auth/register/match). */
  const [match, setMatch] = useState<RegisterMatch | null>(null);
  /** Kode klaim data lama salah / kedaluwarsa → ditampilkan di sheet, bukan alert global. */
  const [claimError, setClaimError] = useState<{ msg: string; n: number } | null>(null);
  const expiredShown = useRef(false);

  /** Waktu habis / OTP tidak berlaku → ulang dari awal dengan tumpukan layar bersih. */
  const restartSignup = () => {
    reset();
    router.dismissTo('/(auth)/signup');
  };
  const showExpired = () => {
    if (expiredShown.current) return;
    expiredShown.current = true;
    Alert.alert(t('signup.error_otp_expired_title'), t('signup.error_otp_expired_msg'), [{ text: 'OK', onPress: restartSignup }], {
      cancelable: false,
    });
  };

  // Hitung mundur jendela pendaftaran (60 menit). Alert hanya sekali.
  useEffect(() => {
    if (!otpVerifiedExpiresAt) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      const remaining = Math.max(0, Math.floor((otpVerifiedExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        if (timer) clearInterval(timer);
        showExpired();
      }
    };
    update();
    timer = setInterval(update, 1000);
    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpVerifiedExpiresAt]);

  const branchesQuery = useBranches();

  const viaEmail = channel === 'email';
  const matchPayload = (): RegisterMatchPayload => ({
    otpChannel: viaEmail ? 'email' : 'whatsapp',
    noHp: viaEmail ? undefined : noHp,
    email: viaEmail ? signupEmail : undefined,
    namaLengkap: namaLengkap.trim(),
    tanggalLahir,
    cabangId,
  });

  const mutation = useMutation({
    mutationFn: async (claim?: { claimJemaatId: string; claimKode: string }) =>
      register({
        // Per BE patch 2026-05-21d — hanya 4 field wajib. alamat & foto
        // dilengkapi nanti via Profile → Edit.
        otpChannel: viaEmail ? 'email' : 'whatsapp',
        noHp: viaEmail ? undefined : noHp,
        namaLengkap,
        jenisKelamin: jenisKelamin as 'L' | 'P',
        cabangId,
        email: signupEmail || undefined,
        tanggalLahir: tanggalLahir || undefined,
        ...(claim ?? {}),
        // Per BE request 2026-05-23 (M23): signup-time jenis jemaat
        // assignment. Mobile cuma ask jenisJemaat (Tetap vs NewComer);
        // fulltimer status di-assign manual oleh admin di portal.
        jenisJemaat: jenisJemaat as JenisJemaat,
        // Kepatuhan no. 2 — bukti persetujuan dicatat saat daftar.
        consent: isConsentComplete(consent)
          ? buildConsentPayload(consent.ageGroup, i18n.language ?? 'id')
          : undefined,
      }),
    onSuccess: async (data) => {
      setMatch(null);
      await login(data.accessToken, data.refreshToken, data.user);
      router.replace('/(auth)/signup/success');
    },
    onError: (err, claim) => {
      // Gagal saat klaim data lama (kode salah, dsb.) → tetap di sheet.
      if (claim && err instanceof ApiError && err.code === 'CONFLICT') {
        // Data lama sudah memakai nomor lain, dsb. → tutup sheet, jelaskan.
        setMatch(null);
        Alert.alert(t('signup.claim_failed_title'), err.message);
        return;
      }
      if (claim && err instanceof ApiError) {
        setClaimError((c) => ({ msg: err.code === 'UNAUTHORIZED' ? t('auth.error_otp_invalid') : err.message, n: (c?.n ?? 0) + 1 }));
        return;
      }
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details?.fieldErrors) {
          const fe = err.details.fieldErrors;
          setErrors({
            namaLengkap: fe.namaLengkap?.[0],
            jenisKelamin: fe.jenisKelamin?.[0],
            cabangId: fe.cabangId?.[0],
            jenisJemaat: fe.jenisJemaat?.[0],
          });
        } else if (err.code === 'UNAUTHORIZED' && !/data lama/i.test(err.message)) {
          setMatch(null);
          showExpired();
        } else if (err.code === 'FORBIDDEN' || err.code === 'BAD_REQUEST' || err.code === 'UNAUTHORIZED') {
          Alert.alert(t('error.generic'), err.message);
        } else if (err.code === 'CONFLICT') {
          setMatch(null);
          Alert.alert(viaEmail ? t('signup.email_already_registered') : t('signup.error_already_registered'), /data lama/i.test(err.message) ? err.message : undefined);
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
    else {
      const n = cekNama(namaLengkap);
      if (n) next.namaLengkap = n;
    }
    if (!jenisKelamin) next.jenisKelamin = t('signup.error_gender_required');
    if (!cabangId) next.cabangId = t('signup.error_branch_required');
    if (!jenisJemaat) next.jenisJemaat = t('signup.error_jenis_jemaat_required');
    if (!isConsentComplete(consent)) next.consent = t('consent.error_incomplete');
    if (tanggalLahir) {
      const d = cekTanggalLahir(parseLocalDate(tanggalLahir));
      if (d) next.tanggalLahir = d;
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!tanggalLahir) {
      mutation.mutate(undefined);
      return;
    }
    matchMutation.mutate();
  }

  // Cari data jemaat lama yang mungkin milik pendaftar (nama mirip + tanggal lahir & cabang sama).
  // Gagal / tidak ada → langsung daftar seperti biasa.
  const matchMutation = useMutation({
    mutationFn: () => registerMatch(matchPayload()),
    onSuccess: (r) => {
      if (r?.match) setMatch(r.match);
      else mutation.mutate(undefined);
    },
    onError: () => mutation.mutate(undefined),
  });

  function handleBack() {
    Alert.alert(t('signup.cancel_confirm_title'), t('signup.cancel_confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          reset();
          router.dismissTo('/(auth)/welcome');
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
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'bottom']}>
      <View className="px-4 py-2 bg-card">
        <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color={nc('#171717')} />
        </Pressable>
      </View>

      <KeyboardSafeView className="flex-1">
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
            <Clock size={14} color={secondsLeft < 120 ? '#D97706' : nc('#737373')} />
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
        <View className="bg-card rounded-2xl p-4 gap-3 border border-neutral-100">
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

          <View>
            <Text className="text-sm font-medium text-neutral-700 mb-1.5">{t('signup.dob_label')}</Text>
            <Pressable
              onPress={() => setShowDob(true)}
              className={`px-4 py-3 border rounded-xl flex-row items-center justify-between bg-card ${
                errors.tanggalLahir ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <Text className={`text-base ${tanggalLahir ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {tanggalLahir ? formatDate(tanggalLahir, i18n.language) : t('signup.dob_placeholder')}
              </Text>
              <CalendarIcon size={18} color={nc('#737373')} />
            </Pressable>
            <Text className={`text-xs mt-1 ${errors.tanggalLahir ? 'text-red-600' : 'text-neutral-500'}`}>
              {errors.tanggalLahir ?? t('signup.dob_helper')}
            </Text>
          </View>

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

        {/* Q1: Jenis Jemaat (Tetap vs New Comer) */}
        <View className="bg-card rounded-2xl p-4 mt-3 gap-2 border border-neutral-100">
          <Text className="text-sm font-semibold text-neutral-900">
            {t('signup.q_jenis_jemaat_title')}
          </Text>
          <Text className="text-xs text-neutral-500 mb-1">
            {t('signup.q_jenis_jemaat_sub')}
          </Text>
          <SegmentedControl<JenisJemaat>
            value={jenisJemaat as JenisJemaat | ''}
            options={[
              { value: 'JEMAAT_TETAP', label: t('signup.jemaat_tetap') },
              { value: 'NEW_COMER', label: t('signup.new_comer') },
            ]}
            onChange={(v) => {
              setField('jenisJemaat', v);
              setErrors((e) => ({ ...e, jenisJemaat: undefined }));
            }}
          />
          {errors.jenisJemaat ? (
            <Text className="text-xs text-red-600">{errors.jenisJemaat}</Text>
          ) : null}
        </View>

        <View className="mt-3">
          <ConsentChecklist
            value={consent}
            onChange={(v) => {
              setConsent(v);
              setErrors((e) => ({ ...e, consent: undefined }));
            }}
            error={errors.consent}
          />
        </View>

        <View className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex-row gap-2">
          <Info size={16} color={nc('#1d4ed8')} />
          <Text className="text-xs text-blue-800 flex-1">{t('signup.minimal_notice')}</Text>
        </View>

        <View className="mt-3 mb-6 p-3 bg-brand-50 border border-brand-100 rounded-xl flex-row gap-2">
          <Info size={16} color="#EA580C" />
          <Text className="text-xs text-brand-800 flex-1">{t('signup.auto_active_notice')}</Text>
        </View>
      </ScrollView>

      <View className="px-5 py-3 border-t bg-card border-neutral-100">
        <Button
          label={t('signup.submit')}
          onPress={submit}
          loading={mutation.isPending || matchMutation.isPending}
          fullWidth
          size="lg"
        />
      </View>
      </KeyboardSafeView>

      {showDob ? (
        <DatePickerModal
          value={tanggalLahir ? parseLocalDate(tanggalLahir) : new Date(1990, 0, 1)}
          onChange={(d) => {
            setField('tanggalLahir', toIsoDate(d));
            setErrors((e) => ({ ...e, tanggalLahir: undefined }));
          }}
          onClose={() => setShowDob(false)}
        />
      ) : null}

      {match ? (
        <OldRecordSheet
          match={match}
          payload={matchPayload()}
          registering={mutation.isPending}
          claimError={claimError}
          onRegister={(claim) => {
            setClaimError(null);
            mutation.mutate(claim);
          }}
          onClose={() => {
            setClaimError(null);
            setMatch(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/**
 * "Apakah ini Anda?" — data jemaat lama yang mirip pendaftar.
 *   - Bisa diklaim (data lama punya email): kode dikirim ke email itu → sambungkan.
 *   - Tidak bisa diklaim: pendaftaran lanjut, admin cabang menyatukan data.
 *   - "Bukan saya": pendaftaran lanjut seperti biasa.
 */
function OldRecordSheet({
  match,
  payload,
  registering,
  claimError,
  onRegister,
  onClose,
}: {
  match: RegisterMatch;
  payload: RegisterMatchPayload;
  registering: boolean;
  claimError: { msg: string; n: number } | null;
  onRegister: (claim?: { claimJemaatId: string; claimKode: string }) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'ask' | 'noemail' | 'code'>('ask');
  /** Email gangguan saat kirim kode klaim → lanjut daftar, admin menyatukan. */
  const [emailDown, setEmailDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);

  const sendCode = useMutation({
    mutationFn: () => requestClaimOtp({ ...payload, claimJemaatId: match.jemaatId }),
    onSuccess: () => {
      setError(null);
      setStep('code');
      setOtpKey((k) => k + 1);
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.code as string) === 'EMAIL_UNAVAILABLE') {
        setEmailDown(true);
        setStep('noemail');
        return;
      }
      setError(e instanceof ApiError ? e.message : t('error.network'));
    },
  });

  // Kode klaim salah → kosongkan kolom kode supaya bisa diketik ulang.
  useEffect(() => {
    if (claimError) setOtpKey((k) => k + 1);
  }, [claimError]);

  const busy = registering || sendCode.isPending;
  const shownError = error ?? claimError?.msg ?? null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <KeyboardSafeView style={{ flex: 1 }}>
      <View className="flex-1 justify-end">
        <Pressable onPress={() => !busy && onClose()} className="absolute inset-0 bg-black/50" />
        <View className="bg-card rounded-t-3xl px-5 pt-4 pb-6" style={{ maxHeight: '90%' }}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
                <UserSearch size={18} color="#EA580C" />
              </View>
              <Text className="flex-1 text-base font-bold text-neutral-900">{t('signup.match_title')}</Text>
              <Pressable onPress={() => !busy && onClose()} hitSlop={8} className="p-1">
                <X size={20} color={nc('#737373')} />
              </Pressable>
            </View>

            {step === 'ask' ? (
              <>
                <Text className="text-sm text-neutral-700 leading-5">
                  {t('signup.match_msg', { nama: match.namaMasked, cabang: match.cabang ?? 'ECC' })}
                </Text>
                {shownError ? <Text className="text-xs text-red-600 mt-3">{shownError}</Text> : null}
                <View className="mt-5 gap-2">
                  <Button
                    label={t('signup.match_yes')}
                    onPress={() => (match.canClaim ? sendCode.mutate() : setStep('noemail'))}
                    loading={sendCode.isPending}
                    disabled={registering}
                    fullWidth
                    size="lg"
                  />
                  <Button
                    label={t('signup.match_no')}
                    variant="secondary"
                    onPress={() => onRegister(undefined)}
                    loading={registering}
                    disabled={sendCode.isPending}
                    fullWidth
                    size="lg"
                  />
                </View>
              </>
            ) : step === 'noemail' ? (
              <>
                <Text className="text-sm text-neutral-700 leading-5">
                  {emailDown ? t('signup.match_email_down') : t('signup.match_noemail_msg')}
                </Text>
                <View className="mt-5">
                  <Button label={t('signup.match_continue')} onPress={() => onRegister(undefined)} loading={registering} fullWidth size="lg" />
                </View>
              </>
            ) : (
              <>
                <Text className="text-sm text-neutral-700 leading-5 mb-3">
                  {t('signup.match_claim_msg', { email: match.emailMasked ?? '' })}
                </Text>
                {/* Kolom kode di atas supaya tidak tertutup keyboard di layar kecil. */}
                <OtpInput
                  key={otpKey}
                  onComplete={(kode) => {
                    setError(null);
                    onRegister({ claimJemaatId: match.jemaatId, claimKode: kode });
                  }}
                  onChange={() => setError(null)}
                  disabled={registering}
                />
                {registering ? <ActivityIndicator color="#F97316" style={{ marginTop: 12 }} /> : null}
                {shownError ? <Text className="text-xs text-red-600 mt-3 text-center">{shownError}</Text> : null}
                <SpamHint className="mt-4" />
                <View className="flex-row justify-between mt-5">
                  <Pressable onPress={() => onRegister(undefined)} disabled={registering} hitSlop={8}>
                    <Text className="text-sm text-neutral-600">{t('signup.match_skip')}</Text>
                  </Pressable>
                  <Pressable onPress={() => sendCode.mutate()} disabled={sendCode.isPending} hitSlop={8}>
                    <Text className="text-sm font-semibold text-brand-600">
                      {sendCode.isPending ? t('common.loading') : t('auth.otp_resend')}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
          <SheetNavSpacer />
        </View>
      </View>
      </KeyboardSafeView>
    </Modal>
  );
}
