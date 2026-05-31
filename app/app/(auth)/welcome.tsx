/**
 * Welcome screen — entry point untuk unauthenticated users.
 *
 * 2026-05-26: Face login removed (lihat docs/mobile-face-login-removal-impact.md).
 * Auth options sekarang: OTP, Sign up, Guest mode.
 */
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Eye, MessageCircleMore, UserPlus } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';

type Option = {
  label: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);

  const options: Option[] = [
    {
      label: t('auth.signin_otp'),
      sub: t('auth.signin_otp_sub'),
      icon: <MessageCircleMore size={20} color="#fff" />,
      iconBg: 'bg-white/20',
      variant: 'primary',
      onPress: () => router.push('/(auth)/login'),
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
      onPress: async () => {
        await enterGuestMode();
        // Root layout RootLayoutNav akan auto-redirect ke (tabs)
        // karena isAuthenticated=true setelah enterGuestMode().
      },
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
          <Text className="text-2xl font-bold text-neutral-900 mt-4">Els App</Text>
          <Text className="text-neutral-500 text-sm mt-1">{t('auth.welcome_sub')}</Text>
        </View>

        {/* Primary actions */}
        <View className="gap-2.5">
          {options.map((o, i) => (
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
    </SafeAreaView>
  );
}

function OptionCard({ option }: { option: Option }) {
  const isPrimary = option.variant === 'primary';
  return (
    <Pressable
      onPress={option.onPress}
      className={`rounded-2xl p-4 flex-row items-center gap-3 ${
        isPrimary ? 'bg-brand-500' : 'bg-white border border-neutral-200'
      }`}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center ${option.iconBg}`}
      >
        {option.icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-bold ${isPrimary ? 'text-white' : 'text-neutral-900'}`}
        >
          {option.label}
        </Text>
        <Text
          className={`text-xs mt-0.5 ${isPrimary ? 'text-white/80' : 'text-neutral-500'}`}
        >
          {option.sub}
        </Text>
      </View>
      <ChevronRight size={18} color={isPrimary ? '#fff' : '#A3A3A3'} />
    </Pressable>
  );
}
