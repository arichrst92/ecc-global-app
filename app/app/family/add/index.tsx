import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Phone, QrCode, UserPlus } from 'lucide-react-native';

export default function FamilyAddOptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const options = [
    {
      key: 'scan',
      icon: <QrCode size={22} color="#1d4ed8" />,
      iconBg: 'bg-blue-50',
      label: t('family.add_via_scan'),
      sub: t('family.add_via_scan_sub'),
      onPress: () => router.push('/family/add/scan'),
    },
    {
      key: 'phone',
      icon: <Phone size={22} color="#EA580C" />,
      iconBg: 'bg-brand-50',
      label: t('family.add_via_phone'),
      sub: t('family.add_via_phone_sub'),
      onPress: () => router.push('/family/add/phone'),
    },
    {
      key: 'new',
      icon: <UserPlus size={22} color="#059669" />,
      iconBg: 'bg-emerald-50',
      label: t('family.add_via_new'),
      sub: t('family.add_via_new_sub'),
      onPress: () => router.push('/family/add/new'),
    },
  ];

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
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('family.add_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        <Text className="text-sm text-neutral-600 mb-4 leading-relaxed">
          {t('family.add_intro')}
        </Text>

        <View className="gap-2.5">
          {options.map((o) => (
            <Pressable
              key={o.key}
              onPress={o.onPress}
              className="bg-white rounded-2xl p-4 flex-row items-center gap-3 border border-neutral-100"
            >
              <View className={`w-12 h-12 rounded-xl ${o.iconBg} items-center justify-center`}>
                {o.icon}
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-neutral-900">{o.label}</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{o.sub}</Text>
              </View>
              <ChevronRight size={18} color="#A3A3A3" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
