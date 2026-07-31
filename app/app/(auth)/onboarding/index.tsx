/**
 * Onboarding wizard — first-login flow untuk legacy jemaat.
 *
 * Trigger: user.needsOnboarding === true dari login response (magic link atau OTP).
 * Screen ini di-route dari getPostLoginRoute(user).
 *
 * State machine (per BE notice magic-link 2026-07-28):
 *   intro → [add-phone-input → add-phone-otp (kalau missingNoHp)] → profile
 *   → submitting → route ke /(tabs)
 *
 * Skip logic: kalau onboardingReason.missingNoHp === false, wizard langsung
 * dari intro ke profile — 2 step phone dilewati.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  MessageCircleMore,
  Sparkles,
  UserCircle,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Picker } from '@/components/ui/Picker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import {
  completeOnboarding,
  requestOtpAddNoHp,
  verifyOtpAddNoHp,
} from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useBranches } from '@/hooks/useBranches';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';

const RESEND_COOLDOWN_SEC = 60;

export default function OnboardingWizardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const step = useOnboardingStore((s) => s.step);
  const setStep = useOnboardingStore((s) => s.setStep);
  const pendingNoHp = useOnboardingStore((s) => s.pendingNoHp);
  const setPendingNoHp = useOnboardingStore((s) => s.setPendingNoHp);
  const markNoHpVerified = useOnboardingStore((s) => s.markNoHpVerified);
  const noHpVerified = useOnboardingStore((s) => s.noHpVerified);
  const namaLengkap = useOnboardingStore((s) => s.namaLengkap);
  const jenisKelamin = useOnboardingStore((s) => s.jenisKelamin);
  const tanggalLahir = useOnboardingStore((s) => s.tanggalLahir);
  const alamat = useOnboardingStore((s) => s.alamat);
  const cabangId = useOnboardingStore((s) => s.cabangId);
  const email = useOnboardingStore((s) => s.email);
  const setField = useOnboardingStore((s) => s.setField);
  const hydrateFromUser = useOnboardingStore((s) => s.hydrateFromUser);
  const reset = useOnboardingStore((s) => s.reset);

  const missingNoHp = user?.onboardingReason?.missingNoHp === true;
  const missingProfile = useMemo(
    () => user?.onboardingReason?.missingProfile ?? [],
    [user?.onboardingReason?.missingProfile],
  );

  // Pre-fill dari user object saat mount (hanya sekali)
  useEffect(() => {
    if (user) {
      hydrateFromUser({
        namaLengkap: user.namaLengkap,
        email: user.email,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset wizard state saat leave screen (unmount)
  useEffect(() => {
    return () => {
      // Only reset kalau sudah selesai submit — supaya kalau user back mid-wizard,
      // state tetap ada. Reset trigger via router.replace('/(tabs)') di submit.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard: kalau user tidak ada / tidak butuh onboarding, route out
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/welcome');
    } else if (user.needsOnboarding !== true) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  if (!user || user.needsOnboarding !== true) return null;

  // ============ STEP: INTRO ============
  if (step === 'intro') {
    return (
      <IntroStep
        userName={user.namaLengkap}
        missingNoHp={missingNoHp}
        missingProfileCount={missingProfile.length}
        onStart={() => {
          if (missingNoHp) {
            setStep('add-phone-input');
          } else {
            setStep('profile');
          }
        }}
      />
    );
  }

  // ============ STEP: ADD PHONE — INPUT ============
  if (step === 'add-phone-input') {
    return (
      <AddPhoneInputStep
        initialValue={pendingNoHp}
        onBack={() => setStep('intro')}
        onSubmitted={(e164) => {
          setPendingNoHp(e164);
          setStep('add-phone-otp');
        }}
      />
    );
  }

  // ============ STEP: ADD PHONE — OTP ============
  if (step === 'add-phone-otp') {
    return (
      <AddPhoneOtpStep
        noHp={pendingNoHp}
        onBack={() => setStep('add-phone-input')}
        onVerified={() => {
          markNoHpVerified();
          setStep('profile');
        }}
      />
    );
  }

  // ============ STEP: PROFILE ============
  return (
    <ProfileStep
      missingProfile={missingProfile}
      values={{ namaLengkap, jenisKelamin, tanggalLahir, alamat, cabangId, email }}
      // Adapter: ProfileValues keys adalah subset dari OnboardingState. Cast
      // OK karena kita hanya expose profile-related keys ke ProfileStep.
      setField={(k, v) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setField(k as keyof ReturnType<typeof useOnboardingStore.getState>, v as any)
      }
      onBack={() => {
        // Kalau ada phone step, back ke situ; else intro
        if (missingNoHp && noHpVerified) {
          setStep('add-phone-otp');
        } else {
          setStep('intro');
        }
      }}
      submitting={step === 'submitting'}
      onSubmit={async (payload) => {
        setStep('submitting');
        try {
          const updated = await completeOnboarding(payload);
          // Update auth store user — clear needsOnboarding + merge new fields.
          // BE return partial jemaat, tapi mobile perlu preserve fields yg tidak
          // ada di response (menuAccess, etc).
          if (user) {
            await setUser({
              ...user,
              namaLengkap: updated.namaLengkap ?? user.namaLengkap,
              // updated.noHp mungkin di-set setelah OTP verify — merge kalau ada
              noHp: (updated as unknown as { noHp?: string }).noHp ?? user.noHp,
              email: (updated as unknown as { email?: string | null }).email ?? user.email,
              needsOnboarding: false,
              onboardingReason: undefined,
            });
          }

          // Invalidate profile-related queries supaya UI di-refresh dgn data baru
          await queryClient.invalidateQueries({ queryKey: ['me'] });

          showToast(t('auth.onboarding.success_toast'), 'success');
          reset();
          router.replace('/(tabs)');
        } catch (err) {
          setStep('profile');
          const msg = err instanceof ApiError ? err.message : t('error.network');
          Alert.alert(t('auth.onboarding.submit_error_title'), msg);
        }
      }}
    />
  );
}

/* ==============================================================
 * INTRO STEP
 * ============================================================== */
function IntroStep({
  userName,
  missingNoHp,
  missingProfileCount,
  onStart,
}: {
  userName: string;
  missingNoHp: boolean;
  missingProfileCount: number;
  onStart: () => void;
}) {
  const { t } = useTranslation();

  const totalSteps = (missingNoHp ? 1 : 0) + 1; // phone + profile

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <View className="items-center mt-8 mb-6">
          <View className="w-20 h-20 rounded-3xl bg-brand-50 items-center justify-center mb-4">
            <Sparkles size={36} color="#EA580C" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 text-center">
            {t('auth.onboarding.intro_title', { name: userName })}
          </Text>
          <Text className="text-neutral-500 text-sm text-center mt-2 px-4">
            {t('auth.onboarding.intro_body')}
          </Text>
        </View>

        {/* Steps preview */}
        <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 gap-3 mt-4">
          <Text className="text-xs font-bold text-brand-700 uppercase">
            {t('auth.onboarding.steps_title', { total: totalSteps })}
          </Text>
          {missingNoHp ? (
            <StepPreview
              icon={<MessageCircleMore size={20} color="#C2410C" />}
              title={t('auth.onboarding.step_phone_title')}
              body={t('auth.onboarding.step_phone_body')}
            />
          ) : null}
          <StepPreview
            icon={<UserCircle size={20} color="#C2410C" />}
            title={t('auth.onboarding.step_profile_title')}
            body={t('auth.onboarding.step_profile_body', { count: missingProfileCount })}
          />
        </View>
      </ScrollView>

      <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
        <Button
          label={t('auth.onboarding.start')}
          onPress={onStart}
          fullWidth
          size="lg"
          rightIcon={<ArrowRight size={18} color="#fff" />}
        />
      </View>
    </SafeAreaView>
  );
}

function StepPreview({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-900">{title}</Text>
        <Text className="text-xs text-neutral-600 mt-0.5">{body}</Text>
      </View>
    </View>
  );
}

/* ==============================================================
 * ADD PHONE — INPUT STEP
 * ============================================================== */
function AddPhoneInputStep({
  initialValue,
  onBack,
  onSubmitted,
}: {
  initialValue: string;
  onBack: () => void;
  onSubmitted: (e164: string) => void;
}) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (e164: string) => requestOtpAddNoHp(e164),
    onSuccess: (_data, e164) => {
      onSubmitted(e164);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          setError(t('auth.onboarding.phone_error_conflict'));
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
        className="flex-1"
      >
        <View className="px-4 py-2">
          <Pressable onPress={onBack} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
            <MessageCircleMore size={28} color="#EA580C" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 mb-2">
            {t('auth.onboarding.phone_title')}
          </Text>
          <Text className="text-neutral-500 text-sm mb-7">
            {t('auth.onboarding.phone_subtitle')}
          </Text>

          <PhoneInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
            label={t('auth.phone_label')}
            placeholder={t('auth.phone_placeholder')}
            helper={!error ? t('auth.onboarding.phone_helper') : undefined}
            error={error ?? undefined}
            autoFocus
            editable={!mutation.isPending}
          />
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

/* ==============================================================
 * ADD PHONE — OTP VERIFY STEP
 * ============================================================== */
function AddPhoneOtpStep({
  noHp,
  onBack,
  onVerified,
}: {
  noHp: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => verifyOtpAddNoHp({ noHp, kode: code }),
    onSuccess: () => {
      showToast(t('auth.onboarding.otp_verify_success'), 'success');
      onVerified();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'UNAUTHORIZED') {
          setError(t('auth.error_otp_invalid'));
        } else if (err.code === 'CONFLICT') {
          setError(t('auth.onboarding.phone_error_conflict'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('error.network'));
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => requestOtpAddNoHp(noHp),
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_SEC);
      showToast(t('auth.otp_resent'), 'success');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t('error.network');
      showToast(msg, 'error');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="px-4 py-2">
        <Pressable onPress={onBack} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={20} color="#171717" />
        </Pressable>
      </View>

      <View className="flex-1 px-6">
        <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
          <MessageCircleMore size={28} color="#EA580C" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 mb-2">
          {t('auth.otp_title')}
        </Text>
        <Text className="text-neutral-500 text-sm mb-6">
          {t('auth.onboarding.otp_sub', { noHp })}
        </Text>

        <OtpInput
          length={6}
          autoFocus
          onComplete={(code: string) => verifyMutation.mutate(code)}
          disabled={verifyMutation.isPending}
        />

        {error ? (
          <Text className="text-xs text-red-600 mt-3 text-center">{error}</Text>
        ) : null}

        <View className="mt-6 items-center">
          {cooldown > 0 ? (
            <Text className="text-sm text-neutral-500">
              {t('auth.otp_resend_in', { seconds: cooldown })}
            </Text>
          ) : (
            <Pressable
              onPress={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              <Text className="text-sm font-semibold text-brand-500">
                {resendMutation.isPending
                  ? t('common.loading')
                  : t('auth.otp_resend')}
              </Text>
            </Pressable>
          )}
        </View>

        {verifyMutation.isPending ? (
          <View className="mt-4 items-center">
            <ActivityIndicator color="#EA580C" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/* ==============================================================
 * PROFILE STEP — Final form + submit
 * ============================================================== */
type ProfileValues = {
  namaLengkap: string;
  jenisKelamin: 'L' | 'P' | '';
  tanggalLahir: string;
  alamat: string;
  cabangId: string;
  email: string;
};

type ProfileFieldErrors = Partial<Record<keyof ProfileValues, string>>;

function ProfileStep({
  missingProfile,
  values,
  setField,
  onBack,
  submitting,
  onSubmit,
}: {
  missingProfile: string[];
  values: ProfileValues;
  setField: <K extends keyof ProfileValues>(key: K, v: ProfileValues[K]) => void;
  onBack: () => void;
  submitting: boolean;
  onSubmit: (payload: {
    namaLengkap?: string;
    jenisKelamin?: 'L' | 'P';
    tanggalLahir?: string;
    alamat?: string;
    cabangId?: string;
    email?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const branchesQuery = useBranches();
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const branchOptions = useMemo(
    () =>
      (branchesQuery.data ?? []).map((b) => ({
        value: b.id,
        label: b.nama,
      })),
    [branchesQuery.data],
  );

  const requiresGender = missingProfile.includes('jenisKelamin');
  const requiresDob = missingProfile.includes('tanggalLahir');

  function submit() {
    const nextErrors: ProfileFieldErrors = {};
    if (!values.namaLengkap.trim()) {
      nextErrors.namaLengkap = t('auth.onboarding.error_name_required');
    }
    if (requiresGender && !values.jenisKelamin) {
      nextErrors.jenisKelamin = t('auth.onboarding.error_gender_required');
    }
    if (requiresDob && !values.tanggalLahir) {
      nextErrors.tanggalLahir = t('auth.onboarding.error_dob_required');
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = t('auth.email.error_invalid_format');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Build payload — hanya kirim field yang diisi (undefined skipped BE-side)
    onSubmit({
      namaLengkap: values.namaLengkap.trim() || undefined,
      jenisKelamin: values.jenisKelamin || undefined,
      tanggalLahir: values.tanggalLahir || undefined,
      alamat: values.alamat.trim() || undefined,
      cabangId: values.cabangId || undefined,
      email: values.email.trim() || undefined,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-4 py-2">
          <Pressable
            onPress={onBack}
            disabled={submitting}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-16 h-16 rounded-2xl bg-brand-50 items-center justify-center mb-5 mt-2">
            <UserCircle size={28} color="#EA580C" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 mb-2">
            {t('auth.onboarding.profile_title')}
          </Text>
          <Text className="text-neutral-500 text-sm mb-6">
            {t('auth.onboarding.profile_subtitle')}
          </Text>

          <View className="gap-3">
            <TextField
              label={t('signup.full_name')}
              placeholder={t('signup.full_name_placeholder')}
              value={values.namaLengkap}
              onChangeText={(v) => {
                setField('namaLengkap', v);
                setErrors((e) => ({ ...e, namaLengkap: undefined }));
              }}
              error={errors.namaLengkap}
              editable={!submitting}
            />

            <View>
              <SegmentedControl<'L' | 'P'>
                label={
                  requiresGender
                    ? t('signup.gender') + ' *'
                    : t('signup.gender')
                }
                value={values.jenisKelamin}
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
                <Text className="text-xs text-red-600 mt-1">{errors.jenisKelamin}</Text>
              ) : null}
            </View>

            {/* Date of birth */}
            <View>
              <Text className="text-xs font-medium text-neutral-600 mb-1">
                {t('auth.onboarding.dob_label') + (requiresDob ? ' *' : '')}
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className={`px-3 py-3 border rounded-lg flex-row items-center justify-between ${
                  errors.tanggalLahir ? 'border-red-400' : 'border-neutral-200'
                }`}
              >
                <Text
                  className={`text-sm ${
                    values.tanggalLahir ? 'text-neutral-900' : 'text-neutral-400'
                  }`}
                >
                  {values.tanggalLahir || t('auth.onboarding.dob_placeholder')}
                </Text>
                <CalendarIcon size={18} color="#737373" />
              </Pressable>
              {errors.tanggalLahir ? (
                <Text className="text-xs text-red-600 mt-1">{errors.tanggalLahir}</Text>
              ) : null}
            </View>

            <TextField
              label={t('auth.onboarding.address_label')}
              placeholder={t('auth.onboarding.address_placeholder')}
              value={values.alamat}
              onChangeText={(v) => setField('alamat', v)}
              multiline
              editable={!submitting}
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
              value={values.cabangId}
              options={branchOptions}
              onChange={(v) => setField('cabangId', v)}
              modalTitle={t('signup.branch_modal_title')}
            />

            <TextField
              label={t('auth.onboarding.email_label')}
              placeholder={t('auth.email.placeholder')}
              value={values.email}
              onChangeText={(v) => {
                setField('email', v);
                setErrors((e) => ({ ...e, email: undefined }));
              }}
              helper={t('auth.onboarding.email_helper')}
              error={errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!submitting}
            />
          </View>
        </ScrollView>

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('auth.onboarding.submit')}
            onPress={submit}
            loading={submitting}
            fullWidth
            size="lg"
            rightIcon={<CheckCircle2 size={18} color="#fff" />}
          />
        </View>
      </KeyboardAvoidingView>

      {showDatePicker ? (
        <DatePickerModal
          value={values.tanggalLahir ? new Date(values.tanggalLahir) : new Date(1990, 0, 1)}
          onChange={(d) => {
            const iso = d.toISOString().slice(0, 10);
            setField('tanggalLahir', iso);
            setErrors((e) => ({ ...e, tanggalLahir: undefined }));
          }}
          onClose={() => setShowDatePicker(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

/* ==============================================================
 * DatePickerModal — copy dari app/settings/edit-profile.tsx.
 * TODO refactor jadi shared component kalau dipakai 3+ tempat.
 * ============================================================== */
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
        // @ts-ignore — lazy import; resolved runtime after `npm install`
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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 items-center justify-end">
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
