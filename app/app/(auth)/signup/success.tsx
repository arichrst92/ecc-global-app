import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useSignupStore } from '@/stores/signup.store';

export default function SignupSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const reset = useSignupStore((s) => s.reset);

  function handleExplore() {
    reset();
    // root _layout akan redirect ke (tabs) karena isAuthenticated=true
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-brand-50 to-emerald-50">
      <View className="flex-1 items-center justify-center px-8">
        {/* Success check icon */}
        <View className="relative">
          <View
            className="w-28 h-28 rounded-full bg-emerald-500 items-center justify-center"
            style={{ shadowColor: '#10B981', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}
          >
            <Check size={56} color="#fff" strokeWidth={3} />
          </View>
          <Text className="absolute -top-2 -right-2 text-3xl">🎉</Text>
          <Text className="absolute -bottom-2 -left-2 text-3xl">🎊</Text>
        </View>

        <Text className="text-2xl font-bold text-neutral-900 mt-6 mb-2 text-center">
          {t('signup.success_title')}
        </Text>
        <Text className="text-neutral-500 text-sm leading-relaxed text-center max-w-xs">
          {t('signup.success_msg')}
        </Text>

        {/* Member code card */}
        {user ? (
          <View className="bg-white rounded-2xl p-4 mt-8 w-full max-w-xs border border-neutral-100">
            <Text className="text-xs text-neutral-500">{t('home.member_code')}</Text>
            <Text className="text-2xl font-bold tracking-widest text-brand-600 mt-1">
              {user.kode}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="px-6 pb-8">
        <Button
          label={t('signup.start_explore')}
          onPress={handleExplore}
          rightIcon={<ArrowRight size={16} color="#fff" />}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
