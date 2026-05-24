import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, ExternalLink, FileText, Globe, Mail, Shield } from 'lucide-react-native';
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
            Els App
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

        {/* Legal section — T&C + Privacy */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-4">
          {t('legal.terms_title')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 mb-3">
          <Pressable
            onPress={() => router.push('/legal/terms' as never)}
            className="p-4 flex-row items-center gap-3 border-b border-neutral-100"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
              <FileText size={18} color="#EA580C" />
            </View>
            <Text className="text-sm font-medium text-neutral-900 flex-1">
              {t('legal.terms_title')}
            </Text>
            <ChevronRight size={14} color="#A3A3A3" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/legal/privacy' as never)}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Shield size={18} color="#2563EB" />
            </View>
            <Text className="text-sm font-medium text-neutral-900 flex-1">
              {t('legal.privacy_title')}
            </Text>
            <ChevronRight size={14} color="#A3A3A3" />
          </Pressable>
        </View>

        {/* Sinode / parent organization */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-4">
          {t('settings.about_synod')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100 p-4 items-center">
          <Image
            source={require('../../assets/images/ecc-logo.png')}
            style={{ width: 120, height: 160 }}
            resizeMode="contain"
          />
          <Text className="text-sm font-semibold text-neutral-900 mt-3 text-center">
            {t('settings.about_synod_name')}
          </Text>
          <Text className="text-xs text-neutral-500 mt-1 text-center leading-relaxed">
            {t('settings.about_synod_tagline')}
          </Text>
        </View>

        {/* Pengembang section */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-4">
          {t('settings.about_developer')}
        </Text>
        <View className="bg-white rounded-2xl border border-neutral-100">
          <Pressable
            onPress={() => Linking.openURL('https://ide.asia')}
            className="p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-neutral-100 items-center justify-center">
              <Image
                source={require('../../assets/images/logo-idea.webp')}
                style={{ width: 28, height: 10 }}
                resizeMode="contain"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">IDE Asia</Text>
              <Text className="text-xs text-neutral-500">ide.asia</Text>
            </View>
            <ExternalLink size={14} color="#A3A3A3" />
          </Pressable>
        </View>

        {/* Powered by IDEA — footer */}
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
