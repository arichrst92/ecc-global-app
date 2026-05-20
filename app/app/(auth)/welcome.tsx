import { Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Church, MessageCircleMore, ScanFace, UserPlus, Eye, ChevronRight } from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';

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
  const showToast = useToast((s) => s.show);

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
      onPress: () => showToast(t('auth.face_coming_soon'), 'info'),
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
    <SafeAreaView className="flex-1 bg-gradient-to-b from-brand-50 to-white">
      <View className="flex-1 px-6">
        {/* Hero */}
        <View className="items-center mt-6 mb-8">
          <View className="w-20 h-20 rounded-3xl bg-brand-500 items-center justify-center mb-4 shadow-lg">
            <Church size={40} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900">{t('auth.welcome_title')}</Text>
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
      </View>

      {/* Footer */}
      <View className="px-6 pb-6">
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
