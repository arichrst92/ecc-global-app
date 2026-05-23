import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Eye,
  MessageCircleMore,
  ScanFace,
  UserPlus,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { faceLogin, requestLivenessNonce } from '@/api/auth';
import { FaceCapture } from '@/components/face/FaceCapture';
import { isFaceDescriptorReady } from '@/services/faceDescriptor';
import { newTelemetrySessionId, trackFaceEvent } from '@/services/telemetry';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuthStore } from '@/stores/auth.store';
import {
  FACE_MODEL_VERSION,
  type FaceLoginPayload,
  type FaceLoginResponse,
} from '@/types/auth';
import { ApiError } from '@/types/api';

type Option = {
  label: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
  hidden?: boolean;
};

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const hasFaceSession = useAuthStore((s) => s.hasFaceSession);
  const login = useAuthStore((s) => s.login);
  const forgetDevice = useAuthStore((s) => s.forgetDevice);
  const user = useAuthStore((s) => s.user);
  const { data: appConfig } = useAppConfig();

  const [canFaceLogin, setCanFaceLogin] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Show face login cuma kalau: ada session restoreable + ML engine ready.
    // Di Expo Go, isFaceDescriptorReady() return false → button hidden.
    hasFaceSession().then((v) => {
      if (mounted) setCanFaceLogin(v && isFaceDescriptorReady());
    });
    // Poll engine ready status (load ~200ms-1s after mount)
    const id = setInterval(() => {
      hasFaceSession().then((v) => {
        if (mounted) setCanFaceLogin(v && isFaceDescriptorReady());
      });
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [hasFaceSession]);

  // Track /face/login roundtrip duration untuk telemetry (set di mutationFn,
  // read di onSuccess/onError).
  const serverRequestStartedAt = useRef<number>(0);

  const loginMutation = useMutation({
    mutationFn: (payload: FaceLoginPayload) => {
      serverRequestStartedAt.current = Date.now();
      return faceLogin(payload);
    },
    onSuccess: async (data: FaceLoginResponse) => {
      await login(data.accessToken, data.refreshToken, data.user);
      setCaptureOpen(false);
      // BE-configurable threshold (per /public/app-config). Default 0.7,
      // admin bisa tune via portal Developer Tools → App Config.
      if (data.confidence < appConfig.lowConfidenceWarnThreshold) {
        showToast(t('face.low_confidence_warn'), 'info');
      } else {
        showToast(t('auth.login_success'), 'success');
      }
      trackFaceEvent({
        sessionId: telemetrySessionId,
        noHp: user?.noHp,
        event: 'face_login_server_response',
        outcome: 'success',
        flow: 'login',
        confidence: data.confidence,
        durationMs: { serverRoundtrip: Date.now() - serverRequestStartedAt.current },
      });
      // Redirect handled by root layout via isAuthenticated change
    },
    onError: (err) => {
      setCaptureOpen(false);
      setLivenessNonce(null);
      setLivenessNonceExpiresAt(null);
      if (err instanceof ApiError) {
        const code = err.code.toLowerCase();
        if (code === 'face_not_enrolled' || code === 'face_no_match' || code === 'face_model_mismatch') {
          showToast(t(`face.error_${code}`), 'error');
        } else if (code.startsWith('liveness_nonce_')) {
          showToast(t(`face.error_${code}`), 'error');
        } else {
          showToast(err.message, 'error');
        }
        // After fatal, allow user re-try OTP
        if (code === 'face_not_enrolled') {
          forgetDevice().then(() => setCanFaceLogin(false));
        }
      } else {
        showToast(t('error.network'), 'error');
      }
      trackFaceEvent({
        sessionId: telemetrySessionId,
        noHp: user?.noHp,
        event: 'face_login_server_response',
        outcome: 'failure',
        flow: 'login',
        failureReason: err instanceof ApiError ? err.code : 'NETWORK_ERROR',
        durationMs: { serverRoundtrip: Date.now() - serverRequestStartedAt.current },
      });
    },
  });

  // Liveness nonce per BE handoff — request sebelum show capture UI.
  // expiresAt dipakai untuk show countdown badge di FaceCapture/LivenessChallenge.
  const [livenessNonce, setLivenessNonce] = useState<string | null>(null);
  const [livenessNonceExpiresAt, setLivenessNonceExpiresAt] = useState<string | null>(null);
  // Telemetry session — mint baru tiap open flow (correlate events).
  const [telemetrySessionId, setTelemetrySessionId] = useState<string>('');

  /** Request fresh liveness nonce. Return true on success, false on failure.
   *  V2 strict (post 2026-06-01): nonce REQUIRED — caller harus return early
   *  kalau ini return false (jangan buka face capture tanpa nonce). */
  async function fetchNonce(sessionId: string): Promise<boolean> {
    if (!user?.noHp) return false;
    const startedAt = Date.now();
    try {
      const res = await requestLivenessNonce({ noHp: user.noHp, purpose: 'LOGIN' });
      setLivenessNonce(res.nonce);
      setLivenessNonceExpiresAt(res.expiresAt);
      trackFaceEvent({
        sessionId,
        noHp: user.noHp,
        event: 'face_nonce_request',
        outcome: 'success',
        flow: 'login',
        durationMs: { nonceRoundtrip: Date.now() - startedAt },
      });
      return true;
    } catch (err) {
      setLivenessNonce(null);
      setLivenessNonceExpiresAt(null);
      showToast(t('face.error_nonce_request_failed'), 'error');
      trackFaceEvent({
        sessionId,
        noHp: user.noHp,
        event: 'face_nonce_request',
        outcome: 'failure',
        flow: 'login',
        failureReason: err instanceof ApiError ? err.code : 'NETWORK_ERROR',
        durationMs: { nonceRoundtrip: Date.now() - startedAt },
      });
      return false;
    }
  }

  async function openFaceCapture() {
    if (!user?.noHp) {
      showToast(t('face.error_no_phone_hint'), 'error');
      return;
    }
    // Mint sessionId baru — correlate semua event downstream sampai close modal.
    const sid = newTelemetrySessionId();
    setTelemetrySessionId(sid);
    trackFaceEvent({
      sessionId: sid,
      noHp: user.noHp,
      event: 'face_login_attempt',
      outcome: 'success', // attempt event itself doesn't fail — just records intent
      flow: 'login',
    });
    const ok = await fetchNonce(sid);
    if (!ok) return; // V2 strict: tidak boleh buka capture tanpa nonce
    setCaptureOpen(true);
  }

  function handleDescriptor(descriptor: number[]) {
    if (!user?.noHp) {
      showToast(t('face.error_no_phone_hint'), 'error');
      setCaptureOpen(false);
      return;
    }
    loginMutation.mutate({
      noHp: user.noHp,
      descriptor,
      modelVersion: FACE_MODEL_VERSION,
      livenessNonce: livenessNonce ?? undefined,
    });
  }

  const options: Option[] = [
    {
      label: t('auth.signin_otp'),
      sub: t('auth.signin_otp_sub'),
      icon: <MessageCircleMore size={20} color="#fff" />,
      iconBg: 'bg-white/20',
      variant: 'primary',
      onPress: () => router.push('/(auth)/login'),
    },
    {
      label: t('auth.signin_face'),
      sub: t('auth.signin_face_sub'),
      icon: <ScanFace size={20} color="#D97706" />,
      iconBg: 'bg-amber-50',
      variant: 'secondary',
      onPress: openFaceCapture,
      hidden: !canFaceLogin,
    },
  ];

  const secondary: Option[] = [
    {
      label: t('auth.signup'),
      sub: t('auth.signup_sub_short'),
      icon: <UserPlus size={20} color="#059669" />,
      iconBg: 'bg-emerald-50',
      variant: 'secondary',
      onPress: () => router.push('/(auth)/signup'),
    },
    {
      label: t('auth.guest'),
      sub: t('auth.guest_sub'),
      icon: <Eye size={20} color="#525252" />,
      iconBg: 'bg-neutral-100',
      variant: 'secondary',
      onPress: () => showToast(t('auth.guest_coming_soon'), 'info'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 px-6">
        {/* Hero */}
        <View className="items-center mt-6 mb-8">
          <Image
            source={require('../../assets/images/logo-ecc.webp')}
            style={{ width: 96, height: 96 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-bold text-neutral-900 mt-4">ECC Global App</Text>
          <Text className="text-neutral-500 text-sm mt-1">{t('auth.welcome_sub')}</Text>
        </View>

        {/* Primary actions */}
        <View className="gap-2.5">
          {options
            .filter((o) => !o.hidden)
            .map((o, i) => (
              <OptionCard key={i} option={o} />
            ))}
        </View>

        {/* Divider */}
        <View className="flex-row items-center gap-3 my-5">
          <View className="flex-1 h-px bg-neutral-200" />
          <Text className="text-xs text-neutral-400 uppercase tracking-wider">{t('auth.or')}</Text>
          <View className="flex-1 h-px bg-neutral-200" />
        </View>

        {/* Secondary actions */}
        <View className="gap-2.5">
          {secondary.map((o, i) => (
            <OptionCard key={i} option={o} />
          ))}
        </View>

        {/* Powered by IDEA */}
        <View className="items-center mt-6">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-neutral-400">Powered by</Text>
            <Image
              source={require('../../assets/images/logo-idea.webp')}
              style={{ width: 56, height: 20 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Footer — T&C + Privacy clickable links per compliance */}
      <View className="px-6 pb-4">
        <Text className="text-xs text-neutral-400 text-center leading-relaxed">
          {t('auth.tos_prefix')}{' '}
          <Text
            className="text-brand-500 font-semibold underline"
            onPress={() => router.push('/legal/terms' as never)}
          >
            {t('auth.tos_link')}
          </Text>
          {' '}{t('auth.tos_and')}{' '}
          <Text
            className="text-brand-500 font-semibold underline"
            onPress={() => router.push('/legal/privacy' as never)}
          >
            {t('auth.privacy_link')}
          </Text>
          {t('auth.tos_suffix')}
        </Text>
      </View>

      {/* Face capture modal */}
      <Modal visible={captureOpen} animationType="slide" onRequestClose={() => setCaptureOpen(false)}>
        {captureOpen ? (
          <FaceCapture
            onSuccess={handleDescriptor}
            onCancel={() => setCaptureOpen(false)}
            requireLiveness
            nonceExpiresAt={livenessNonceExpiresAt}
            onRefreshNonce={() => fetchNonce(telemetrySessionId)}
            telemetrySessionId={telemetrySessionId}
            telemetryFlow="login"
            telemetryNoHp={user?.noHp}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function OptionCard({ option }: { option: Option }) {
  const isPrimary = option.variant === 'primary';
  return (
    <Pressable
      onPress={option.onPress}
      className={`flex-row items-center gap-3 p-4 rounded-2xl ${
        isPrimary ? 'bg-brand-500' : 'bg-white border border-neutral-200'
      }`}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center ${option.iconBg}`}
      >
        {option.icon}
      </View>
      <View className="flex-1">
        <Text
          className={`font-semibold text-base ${isPrimary ? 'text-white' : 'text-neutral-900'}`}
        >
          {option.label}
        </Text>
        <Text
          className={`text-xs mt-0.5 ${isPrimary ? 'text-white/80' : 'text-neutral-500'}`}
        >
          {option.sub}
        </Text>
      </View>
      <ChevronRight size={20} color={isPrimary ? '#fff' : '#A3A3A3'} />
    </Pressable>
  );
}
