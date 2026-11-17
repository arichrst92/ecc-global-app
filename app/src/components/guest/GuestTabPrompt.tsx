/**
 * Layar tab untuk mode tamu pada fitur yang butuh akun (Resolusi, CKids):
 * ikon Els App + penjelasan + tombol daftar / masuk.
 */
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ElsEmptyIcon } from '@/components/ui/ElsEmptyIcon';
import { useAuthStore } from '@/stores/auth.store';

export function GuestTabPrompt({ title, body }: { title: string; body: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);
  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top']}>
      <View className="flex-1 items-center justify-center px-8">
        <ElsEmptyIcon size={80} className="mb-4" />
        <Text className="text-lg font-bold text-neutral-900 text-center mb-2">{title}</Text>
        <Text className="text-sm text-neutral-500 text-center leading-5 mb-6">{body}</Text>
        <Button
          label={t('guest.cta_signup')}
          onPress={async () => {
            await exitGuestMode();
            router.replace('/(auth)/welcome');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
