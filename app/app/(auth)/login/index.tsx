import { useEffect, useState } from 'react';
import {
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
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, MessageCircleMore, ScanFace } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useToast } from '@/components/ui/Toast';
import { faceLogin, requestLivenessNonce, requestOtp } from '@/api/auth';
import { FaceCapture } from '@/components/face/FaceCapture';
import { isFaceDescriptorReady } from '@/services/faceDescriptor';
import { useAuthStore } from '@/stores/auth.store';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/types/api';
import {
  FACE_MODEL_VERSION,
  type FaceLoginPayload,
  type FaceLoginResponse,
} from '@/types/auth';

export default function LoginPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const login = useAuthStore((s) => s.login);
  const setFaceEnrolledHint = useAuthStore((s) => s.setFaceEnrolledHint);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [faceEngineReady, setFaceEngineReady] = useState(false);

  // Poll face engine readiness — di Expo Go selalu false, hide face button.
  useEffect(() => {
    setFaceEngineReady(isFaceDescriptorReady());
    const id = setInterval(() => {
      setFaceEngineReady(isFaceDescriptorReady());
    }, 1000);
    return () => clearInterval(id);
  }, []);

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

  const faceLoginMutation = useMutation({
    mutationFn: (payload: FaceLoginPayload) => faceLogin(payload),
    onSuccess: async (data: FaceLoginResponse) => {
      await login(data.accessToken, data.refreshToken, data.user);
      // Persist hint supaya Welcome quick-login bisa show face button next time
      await setFaceEnrolledHint(true);
      setCaptureOpen(false);
      if (data.confidence < 0.7) {
        showToast(t('face.low_confidence_warn'), 'info');
      } else {
        showToast(t('auth.login_success'), 'success');
      }
    },
    onError: (err) => {
      setCaptureOpen(false);
      // Reset nonce supaya retry langsung request fresh one
      setLivenessNonce(null);
      if (err instanceof ApiError) {
        const code = err.code.toLowerCase();
        if (code === 'face_not_enrolled') {
          showToast(t('face.error_face_not_enrolled'), 'error');
        } else if (
          code === 'face_no_match' ||
          code === 'face_model_mismatch' ||
          code === 'face_invalid_descriptor' ||
          code === 'face_login_rate_limit'
        ) {
          showToast(t(`face.error_${code}`), 'error');
        } else if (code.startsWith('liveness_nonce_')) {
          // Per BE handoff liveness-nonce: error codes EXPIRED/REUSED/INVALID/etc
          showToast(t(`face.error_${code}`), 'error');
        } else {
          showToast(err.message, 'error');
        }
      } else {
        showToast(t('error.network'), 'error');
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

  // Liveness nonce per BE handoff 2026-05-22 — request sebelum show liveness UI.
  // V1 grace: kalau request gagal, tetap proceed (BE log warn). V2 cutover
  // 2026-06-01 akan strict — need fresh nonce.
  const [livenessNonce, setLivenessNonce] = useState<string | null>(null);

  async function startFaceLogin() {
    setError(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError(t('auth.error_invalid_phone'));
      return;
    }
    // Request liveness nonce (TTL 3 menit, one-shot)
    try {
      const res = await requestLivenessNonce({ noHp: e164, purpose: 'LOGIN' });
      setLivenessNonce(res.nonce);
    } catch {
      // V1 grace — proceed tanpa nonce. BE log warn. Setelah V2 cutover ini
      // akan jadi hard fail; saat itu replace dengan setError + return.
      setLivenessNonce(null);
    }
    setCaptureOpen(true);
  }

  function handleDescriptor(descriptor: number[]) {
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError(t('auth.error_invalid_phone'));
      setCaptureOpen(false);
      return;
    }
    faceLoginMutation.mutate({
      noHp: e164,
      descriptor,
      modelVersion: FACE_MODEL_VERSION,
      livenessNonce: livenessNonce ?? undefined,
    });
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

        <View className="px-6 pt-3 pb-3 bg-white border-t border-neutral-100 gap-2">
          <Button
            label={t('auth.send_otp')}
            onPress={submit}
            loading={mutation.isPending}
            disabled={phone.length < 8 || faceLoginMutation.isPending}
            fullWidth
            size="lg"
          />
          {faceEngineReady ? (
            <>
              <Pressable
                onPress={startFaceLogin}
                disabled={phone.length < 8 || mutation.isPending || faceLoginMutation.isPending}
                className={`flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
                  phone.length < 8 || mutation.isPending || faceLoginMutation.isPending
                    ? 'border-neutral-200 opacity-50'
                    : 'border-brand-500'
                }`}
              >
                <ScanFace size={18} color="#EA580C" />
                <Text className="text-sm font-semibold text-brand-600">
                  {faceLoginMutation.isPending
                    ? t('common.loading')
                    : t('auth.signin_face')}
                </Text>
              </Pressable>
              <Text className="text-[10px] text-neutral-400 text-center mt-1">
                {t('auth.face_login_hint')}
              </Text>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Face capture modal */}
      <Modal visible={captureOpen} animationType="slide" onRequestClose={() => setCaptureOpen(false)}>
        {captureOpen ? (
          <FaceCapture
            onSuccess={handleDescriptor}
            onCancel={() => setCaptureOpen(false)}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}
