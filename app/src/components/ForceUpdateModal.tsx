import { Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine } from 'lucide-react-native';

import type { AppVersionInfo } from '@/types/appVersion';
import { gx } from '@/theme/gradient';

const APP_ICON = require('../../assets/images/ecc-icon-ios.png');

/**
 * Force update modal — block semua app interaction kalau current version
 * < minSupportedVersion (BE forceUpdate=true).
 *
 * Rendered di root layout via ForceUpdateGate. Tidak dismissible — user
 * harus tap "Update" yang membuka store page (tombol back Android diabaikan).
 *
 * Layout: SELURUH isi (ikon app, judul, penjelasan, catatan rilis) ada di
 * satu ScrollView yang mengisi sisa layar, tombol Update di-pin di bawah.
 * Jadi catatan rilis sepanjang apa pun / ukuran font besar (aksesibilitas)
 * / layar kecil tetap bisa di-scroll dan tombol Update selalu terlihat.
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

  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
          <View className="flex-1 w-full max-w-md self-center">
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 40, paddingBottom: 16 }}
              showsVerticalScrollIndicator
              persistentScrollbar
              nestedScrollEnabled
            >
              <View className="items-center">
                <Image
                  source={APP_ICON}
                  style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 20 }}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel="Els App"
                />
                <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">{t('update.force_title')}</Text>
                <Text className="text-base text-neutral-600 text-center leading-relaxed mb-2">
                  {t('update.force_body', { latest: data.latestVersion ?? '-' })}
                </Text>
              </View>

              {data.releaseNotes ? (
                <View className="bg-neutral-50 rounded-2xl mt-4 p-4">
                  <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    {t('update.release_notes')}
                  </Text>
                  <Text className="text-sm text-neutral-700 leading-relaxed">{data.releaseNotes}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="px-8 pt-3 pb-6 items-center border-t border-neutral-100">
              {data.downloadUrl ? (
                <Pressable
                  onPress={openStore}
                  accessibilityRole="button"
                  {...gx('bg-brand-500 py-4 px-8 rounded-2xl flex-row items-center justify-center gap-2 w-full')}
                >
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
