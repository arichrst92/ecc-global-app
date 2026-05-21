import { useEffect, useState } from 'react';
import { Image, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Eye,
  Fingerprint,
  MessageCircleMore,
  ScanFace,
  UserPlus,
} from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { refreshSession } from '@/api/auth';
import { authenticate, getBiometricSupport } from '@/services/biometric';
import { useAuthStore } from '@/stores/auth.store';
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

  const hasBiometricSession = useAuthStore((s) => s.hasBiometricSession);
  const setTokens = useAuthStore((s) => s.setTokens);
  const markBiometricUnlocked = useAuthStore((s) => s.markBiometricUnlocked);
  const forgetDevice = useAuthStore((s) => s.forgetDevice);

  // Detect kalau biometric quick-login feasible di device ini
  const [canQuickLogin, setCanQuickLogin] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricFaceLike, setBiometricFaceLike] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [hasSession, support] = await Promise.all([
        hasBiometricSession(),
        getBiometricSupport(),
      ]);
      if (!mounted) return;
      setCanQuickLogin(hasSession && support.isAvailable);
      setBiometricLabel(support.label);
      setBiometricFaceLike(support.primaryType === 'face');
    })();
    return () => {
      mounted = false;
    };
  }, [hasBiometricSession]);

  async function handleQuickLogin() {
    if (unlocking) return;
    setUnlocking(true);
    try {
      // 1. Verify biometric on device
      const result = await authenticate(
        t('biometric.prompt_unlock'),
      );
      if (!result.success) {
        if (result.reason === 'no_enrolled' || result.reason === 'no_hardware') {
          showToast(t('biometric.no_longer_available'), 'info');
          await forgetDevice();
          setCanQuickLogin(false);
        }
        return;
      }

      // 2. Use stored refresh token to get fresh access token
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) {
        showToast(t('auth.session_expired_relogin'), 'error');
        await forgetDevice();
        setCanQuickLogin(false);
        return;
      }

      try {
        const data = await refreshSession(refreshToken);
        await setTokens(data.accessToken, data.refreshToken);
        markBiometricUnlocked();
        // isAuthenticated triggered via store update via useAuthStore login
        // path... but setTokens doesn't flip flag. Set it explicitly.
        useAuthStore.setState({ isAuthenticated: true });
        // Redirect handled di root layout
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Refresh token sudah invalid di BE side — clear + force OTP
          await forgetDevice();
          setCanQuickLogin(false);
          showToast(t('auth.session_expired_relogin'), 'error');
        } else {
          showToast(t('error.network'), 'error');
        }
      }
    } finally {
      setUnlocking(false);
    }
  }

  const QuickIcon = biometricFaceLike ? ScanFace : Fingerprint;

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
      label: unlocking
        ? t('biometric.prompting')
        : t('auth.quick_login_biometric', { method: biometricLabel }),
      sub: t('auth.quick_login_biometric_sub'),
      icon: <QuickIcon size={20} color="#D97706" />,
      iconBg: 'bg-amber-50',
      variant: 'secondary',
      onPress: handleQuickLogin,
      hidden: !canQuickLogin,
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

        {/* Powered by IDEA — di bawah tombol Guest */}
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

      {/* Footer */}
      <View className="px-6 pb-4">
        <Text className="text-xs text-neutral-400 text-center leading-relaxed">
          {t('auth.tos_notice')}
        </Text>
      </View>
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
