import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, Sparkles } from 'lucide-react-native';

import type { AppVersionInfo } from '@/types/appVersion';

/**
 * Force update modal — block semua app interaction kalau current version
 * < minSupportedVersion (BE forceUpdate=true).
 *
 * Rendered di root layout via AppUpdateGate. Tidak dismissible — user
 * harus tap "Update" yang membuka store page atau quit app.
 *
 * Per BE production launch brief 2026-05-23 section 4.3.
 */
type Props = {
  data: AppVersionInfo;
};

export function ForceUpdateModal({ data }: Props) {
  const { t } = useTranslation();

  function openStore() {
    if (data.downloadUrl) {
      Linking.openURL(data.downloadUrl).catch(() => {
        // Silent — kalau gagal buka URL, user bisa search manual
      });
    }
  }

  // Layout: judul di atas, catatan rilis bisa di-scroll (tidak menutupi
  // layar walau panjang), tombol Update selalu terlihat di bawah.
  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
          <View className="flex-1 w-full max-w-md self-center px-8">
            <View className="items-center pt-10">
              <View className="w-20 h-20 rounded-full bg-amber-100 items-center justify-center mb-5">
                <Sparkles size={40} color="#D97706" />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">{t('update.force_title')}</Text>
              <Text className="text-base text-neutral-600 text-center leading-relaxed mb-2">
                {t('update.force_body', { latest: data.latestVersion ?? '?' })}
              </Text>
            </View>

            {data.releaseNotes ? (
              <View className="bg-neutral-50 rounded-2xl mt-4 flex-shrink" style={{ flexGrow: 0, minHeight: 80 }}>
                <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 pt-4 mb-2">
                  {t('update.release_notes')}
                </Text>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} showsVerticalScrollIndicator>
                  <Text className="text-sm text-neutral-700 leading-relaxed">{data.releaseNotes}</Text>
                </ScrollView>
              </View>
            ) : (
              <View className="flex-1" />
            )}

            <View className="pt-5 pb-6 items-center">
              {data.downloadUrl ? (
                <Pressable onPress={openStore} className="bg-brand-500 py-4 px-8 rounded-2xl flex-row items-center justify-center gap-2 w-full">
                  <ArrowDownToLine size={20} color="#fff" />
                  <Text className="text-white font-bold text-base">{t('update.cta_update')}</Text>
                </Pressable>
              ) : (
                <Text className="text-sm text-neutral-500 text-center">{t('update.no_download_url')}</Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
