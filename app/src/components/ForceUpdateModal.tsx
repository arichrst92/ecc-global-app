/**
 * Update WAJIB — memblokir app bila versi terpasang < minSupportedVersion
 * (BE forceUpdate=true). Dirender di root layout via ForceUpdateGate; tidak
 * bisa ditutup (tombol back Android diabaikan).
 *
 * Desain 2.4.4: header oranye brand (logo Els App + versi), isi dapat di-scroll
 * (catatan rilis sepanjang apa pun / font besar tetap aman), tombol di-pin di
 * bawah: "Perbarui sekarang" + "Sudah memperbarui? Periksa lagi" (store kadang
 * terlambat beberapa menit → jemaat bisa cek ulang tanpa menutup app).
 * Semua teks mengikuti bahasa app; catatan rilis memakai kolom bahasa yang
 * sesuai (lihat update/shared.tsx).
 */
import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, RefreshCw, ShieldCheck } from 'lucide-react-native';

import type { AppVersionInfo } from '@/types/appVersion';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { AppLogo, ReleaseNotes, VersionPill, releaseNotesFor, storeUrlFor } from '@/components/update/shared';

type Props = {
  data: AppVersionInfo;
};

export function ForceUpdateModal({ data }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [stillOld, setStillOld] = useState(false);
  const current = Constants.expoConfig?.version ?? '';
  const notes = releaseNotesFor(data, i18n.language);

  function openStore() {
    Linking.openURL(storeUrlFor(data)).catch(() => {});
  }

  async function checkAgain() {
    setChecking(true);
    setStillOld(false);
    try {
      await qc.refetchQueries({ queryKey: ['app-version'] });
    } catch {
      // abaikan — tetap di layar ini
    } finally {
      setChecking(false);
      // Bila masih dirender setelah refetch → versi memang belum terbaru.
      setStillOld(true);
    }
  }

  return (
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View className="flex-1 bg-card">
          {/* Header oranye */}
          <View {...gx('bg-brand-500 rounded-b-3xl')}>
            <SafeAreaView edges={['top']}>
              <View className="items-center px-8 pt-8 pb-8 w-full max-w-md self-center">
                <AppLogo size={84} />
                <Text className="text-white text-2xl font-bold text-center mt-5">{t('update.force_title')}</Text>
                <View className="mt-3">
                  <VersionPill current={current} latest={data.latestVersion} />
                </View>
              </View>
            </SafeAreaView>
          </View>

          <View className="flex-1 w-full max-w-md self-center">
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
              showsVerticalScrollIndicator
              persistentScrollbar
              nestedScrollEnabled
            >
              <Text className="text-base text-neutral-700 text-center leading-relaxed">
                {t('update.force_body', { latest: data.latestVersion ?? '-' })}
              </Text>

              <View className="flex-row items-center gap-2 justify-center mt-3">
                <ShieldCheck size={14} color={nc('#737373')} />
                <Text className="text-xs text-neutral-500">{t('update.data_safe')}</Text>
              </View>

              {notes ? (
                <View className="mt-6">
                  <ReleaseNotes text={notes} />
                </View>
              ) : null}
            </ScrollView>

            <SafeAreaView edges={['bottom']}>
              <View className="px-6 pt-3 pb-4 border-t border-neutral-100 gap-2">
                <Pressable
                  onPress={openStore}
                  accessibilityRole="button"
                  {...gx('bg-brand-500 py-4 rounded-2xl flex-row items-center justify-center gap-2 w-full')}
                >
                  <ArrowDownToLine size={20} color="#fff" />
                  <Text className="text-white font-bold text-base">{t('update.cta_update')}</Text>
                </Pressable>
                <Pressable
                  onPress={checkAgain}
                  disabled={checking}
                  accessibilityRole="button"
                  className="py-3 flex-row items-center justify-center gap-2"
                >
                  {checking ? (
                    <ActivityIndicator size="small" color="#EA580C" />
                  ) : (
                    <RefreshCw size={15} color="#EA580C" />
                  )}
                  <Text className="text-sm font-semibold text-brand-600">
                    {checking ? t('update.checking') : t('update.check_again')}
                  </Text>
                </Pressable>
                {stillOld && !checking ? (
                  <Text className="text-xs text-neutral-500 text-center">{t('update.still_old', { current })}</Text>
                ) : null}
              </View>
            </SafeAreaView>
          </View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
