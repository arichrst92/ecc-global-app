import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Globe, Mail } from 'lucide-react-native';
import * as Linking from 'expo-linking';

import Constants from 'expo-constants';

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const version = (Constants.expoConfig?.version as string) ?? '0.1.0';

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
            {t('settings.about_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
      >
        <View className="items-center mb-6">
          <Image
            source={require('../../assets/images/logo-ecc.webp')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-bold text-neutral-900 mt-4">
            ECC Global App
          </Text>
          <Text className="text-sm text-neutral-500 mt-1">v{version}</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3">
          <Text className="text-sm text-neutral-700 leading-relaxed text-center">
            {t('settings.about_description')}
          </Text>
        </View>

        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-4">
          {t('settings.about_contact')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          <Pressable
            onPress={() => Linking.openURL('mailto:hello@eccchurch.global')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Mail size={18} color="#1d4ed8" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">Email</Text>
              <Text className="text-xs text-neutral-500">hello@eccchurch.global</Text>
            </View>
            <ExternalLink size={14} color="#A3A3A3" />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://eccchurch.global')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <Globe size={18} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900">Website</Text>
              <Text className="text-xs text-neutral-500">eccchurch.global</Text>
            </View>
            <ExternalLink size={14} color="#A3A3A3" />
          </Pressable>
        </View>

        {/* Powered by IDEA */}
        <View className="items-center mt-8 mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-neutral-400">Powered by</Text>
            <Image
              source={require('../../assets/images/logo-idea.webp')}
              style={{ width: 56, height: 20 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
