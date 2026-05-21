import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Globe } from 'lucide-react-native';

import { usePreferencesStore } from '@/stores/preferences.store';

type Lang = {
  code: 'id' | 'en';
  flag: string;
  label: string;
  sublabel: string;
};

const LANGS: Lang[] = [
  { code: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia', sublabel: 'Indonesia' },
  { code: 'en', flag: '🇬🇧', label: 'English', sublabel: 'United Kingdom' },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentLang = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

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
            {t('settings.language_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
      >
        <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
            <Globe size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-brand-900">
              {t('settings.language_app_title')}
            </Text>
            <Text className="text-xs text-brand-700 mt-0.5">
              {t('settings.language_app_sub')}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          {LANGS.map((lang) => {
            const active = lang.code === currentLang;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                className={`bg-white rounded-2xl p-4 flex-row items-center gap-3 border-2 ${
                  active ? 'border-brand-500' : 'border-neutral-100'
                }`}
              >
                <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900">{lang.label}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{lang.sublabel}</Text>
                </View>
                {active ? <Check size={20} color="#F97316" /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="text-xs text-neutral-500 mt-4 text-center leading-relaxed">
          {t('settings.language_content_note')}
        </Text>
      </ScrollView>
    </View>
  );
}
