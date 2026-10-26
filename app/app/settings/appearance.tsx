/**
 * Tampilan — Terang / Gelap. Tidak mengikuti pengaturan HP: hanya pilihan ini
 * yang berlaku. Ganti mode → UI di-mount ulang lalu kembali ke layar ini.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Moon, Palette, Sun } from 'lucide-react-native';

import { usePreferencesStore } from '@/stores/preferences.store';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const darkMode = usePreferencesStore((s) => s.darkMode);
  const setDarkMode = usePreferencesStore((s) => s.setDarkMode);

  const options = [
    { dark: false, icon: <Sun size={22} color="#F59E0B" />, label: t('appearance.light'), sub: t('appearance.light_sub'), preview: ['#FAFAFA', '#FFFFFF', '#171717'] },
    { dark: true, icon: <Moon size={22} color="#A78BFA" />, label: t('appearance.dark'), sub: t('appearance.dark_sub'), preview: ['#0F0F10', '#1C1C1E', '#F5F5F5'] },
  ];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('appearance.title')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 20, paddingTop: 16 }}
      >
        <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
          <View {...gx('w-10 h-10 rounded-xl bg-brand-500 items-center justify-center')}>
            <Palette size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-brand-900">{t('appearance.info_title')}</Text>
            <Text className="text-xs text-brand-700 mt-0.5">{t('appearance.info_sub')}</Text>
          </View>
        </View>

        <View className="gap-2">
          {options.map((o) => {
            const active = o.dark === darkMode;
            return (
              <Pressable
                key={String(o.dark)}
                onPress={() => setDarkMode(o.dark, '/settings/appearance')}
                className={`bg-card rounded-2xl p-4 flex-row items-center gap-3 border-2 ${active ? 'border-brand-500' : 'border-neutral-100'}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                {/* Pratinjau mini */}
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: o.preview[0], padding: 6, borderWidth: 1, borderColor: '#3A3A3D33' }}>
                  <View style={{ flex: 1, borderRadius: 6, backgroundColor: o.preview[1], justifyContent: 'center', paddingHorizontal: 4, gap: 3 }}>
                    <View style={{ height: 3, width: '80%', borderRadius: 2, backgroundColor: o.preview[2] }} />
                    <View style={{ height: 3, width: '55%', borderRadius: 2, backgroundColor: '#F97316' }} />
                  </View>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    {o.icon}
                    <Text className="font-semibold text-neutral-900">{o.label}</Text>
                  </View>
                  <Text className="text-xs text-neutral-500 mt-0.5">{o.sub}</Text>
                </View>
                {active ? <Check size={20} color="#F97316" /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
