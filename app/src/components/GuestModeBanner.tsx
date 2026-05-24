import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Eye, UserPlus } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth.store';

/**
 * GuestModeBanner — banner kecil ditampilkan di top screen yang relevan
 * saat user di mode tamu. CTA: "Daftar Akun" → kembali ke welcome screen
 * lewat exit guest mode.
 *
 * Hidden kalau user tidak di guest mode (no-op render).
 *
 * Reusable di Profile tab, Home, atau screen lain yang ingin remind user
 * mereka belum daftar.
 */
type Props = {
  /** Variant compact (1 baris, no description) untuk top header.
   *  Default false → tampil lengkap dengan deskripsi + CTA prominent. */
  compact?: boolean;
};

export function GuestModeBanner({ compact = false }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const isGuest = useAuthStore((s) => s.isGuest);
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);

  if (!isGuest) return null;

  async function handleSignup() {
    await exitGuestMode();
    router.replace('/(auth)/welcome');
  }

  if (compact) {
    return (
      <Pressable
        onPress={handleSignup}
        className="flex-row items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-3"
      >
        <Eye size={14} color="#D97706" />
        <Text className="flex-1 text-xs text-amber-800 font-medium">
          {t('guest.banner_compact')}
        </Text>
        <Text className="text-xs text-brand-600 font-semibold">
          {t('guest.cta_signup_short')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center gap-2 mb-2">
        <Eye size={16} color="#D97706" />
        <Text className="text-sm font-bold text-amber-900">
          {t('guest.banner_title')}
        </Text>
      </View>
      <Text className="text-xs text-amber-800 leading-relaxed mb-3">
        {t('guest.banner_body')}
      </Text>
      <Pressable
        onPress={handleSignup}
        className="bg-brand-500 py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2"
      >
        <UserPlus size={16} color="#fff" />
        <Text className="text-white font-semibold text-sm">
          {t('guest.cta_signup')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Hook untuk check apakah user di guest mode + handler untuk prompt signup.
 * Convenience untuk screens yang block interaction (RSVP, giving, attendance).
 *
 * Usage:
 *   const { isGuest, promptSignup } = useGuestGuard();
 *   if (isGuest) {
 *     promptSignup(); // Alert dengan opsi "Batal" / "Daftar Sekarang"
 *     return;
 *   }
 */
export function useGuestGuard() {
  const router = useRouter();
  const isGuest = useAuthStore((s) => s.isGuest);
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);

  function promptSignup(onDismiss?: () => void) {
    // Simple alert — caller bisa replace dengan custom modal kalau perlu.
    import('react-native').then(({ Alert }) => {
      const t = (k: string) => k; // placeholder kalau i18n ga di-pass
      Alert.alert(
        'Daftar Akun Diperlukan',
        'Fitur ini hanya tersedia setelah Anda mendaftarkan akun. Daftar sekarang?',
        [
          { text: 'Batal', style: 'cancel', onPress: onDismiss },
          {
            text: 'Daftar Sekarang',
            onPress: async () => {
              await exitGuestMode();
              router.replace('/(auth)/welcome');
            },
          },
        ],
      );
    });
  }

  return { isGuest, promptSignup };
}
