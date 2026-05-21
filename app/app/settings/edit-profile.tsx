import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Construction } from 'lucide-react-native';

/**
 * Edit Profile placeholder — TODO: actual form (nama, email, foto, alamat,
 * tanggal lahir, dll). BE endpoint PATCH /admin/me sudah ada per
 * mobile-api-guide. Tinggal wire form fields + image upload.
 *
 * Saat ini stub karena form belum di-scope. User bisa view profile via
 * tab Profile + edit fields via BE admin portal sementara.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">
            {t('profile.edit_profile')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 32,
          alignItems: 'center',
        }}
      >
        <View className="w-20 h-20 rounded-2xl bg-brand-50 items-center justify-center mb-4">
          <Construction size={32} color="#EA580C" />
        </View>
        <Text className="text-lg font-bold text-neutral-900 text-center mb-2">
          {t('common.loading')}
        </Text>
        <Text className="text-sm text-neutral-500 text-center leading-relaxed max-w-sm">
          Form edit profil sedang dipersiapkan. Sementara, hubungi pengurus cabang Anda untuk update data.
        </Text>
      </ScrollView>
    </View>
  );
}
