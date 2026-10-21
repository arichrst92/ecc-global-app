/**
 * Pemberitahuan update TIDAK wajib — muncul kalau ada versi baru di store
 * (BE updateAvailable=true) tapi versi terpasang masih didukung
 * (forceUpdate=false; yang wajib ditangani ForceUpdateModal).
 *
 * Muncul sekali per versi: "Nanti" menyimpan versi yang dilewati, jadi
 * baru muncul lagi kalau admin publish versi yang lebih baru.
 * Data dari menu App Versions di portal (GET /public/app-version).
 *
 * Layout bottom sheet (maks. 85% tinggi layar): ikon app + judul + catatan
 * rilis ada di ScrollView, tombol Nanti / Update di-pin di bawah. Backdrop
 * adalah Pressable TERPISAH (bukan membungkus sheet) supaya gesture scroll
 * di dalam sheet tidak "dicuri" responder Pressable di Android.
 */
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine } from 'lucide-react-native';

import { useAppVersion } from '@/hooks/useAppVersion';

const DISMISS_KEY = 'app-update.dismissed-version';
const APP_ICON = require('../../assets/images/ecc-icon-ios.png');

export function SoftUpdatePrompt() {
  const { t } = useTranslation();
  const { data } = useAppVersion();
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const latest = data?.latestVersion ?? null;
  const eligible = !!data && data.updateAvailable && !data.forceUpdate && !!latest;

  useEffect(() => {
    if (!eligible || !latest) return;
    let alive = true;
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => {
        if (alive && v !== latest) setVisible(true);
      })
      .catch(() => {
        if (alive) setVisible(true);
      });
    return () => {
      alive = false;
    };
  }, [eligible, latest]);

  if (!eligible || !data) return null;

  function later() {
    setVisible(false);
    if (latest) AsyncStorage.setItem(DISMISS_KEY, latest).catch(() => {});
  }

  function update() {
    setVisible(false);
    if (data?.downloadUrl) Linking.openURL(data.downloadUrl).catch(() => {});
  }

  const current = Constants.expoConfig?.version ?? '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={later}>
      <View className="flex-1 justify-end">
        {/* Backdrop — tap untuk "Nanti" */}
        <Pressable
          onPress={later}
          accessibilityRole="button"
          accessibilityLabel={t('update.soft_later')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />

        <View
          className="bg-white rounded-t-3xl w-full max-w-md self-center"
          style={{ maxHeight: height * 0.85, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-neutral-300 rounded-full" />
          </View>

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
          >
            <View className="flex-row items-center gap-3 mb-3">
              <Image
                source={APP_ICON}
                style={{ width: 52, height: 52, borderRadius: 12 }}
                accessibilityIgnoresInvertColors
                accessibilityLabel="Els App"
              />
              <View className="flex-1 min-w-0">
                <Text className="text-lg font-bold text-neutral-900">{t('update.soft_title')}</Text>
                <Text className="text-xs text-neutral-500">{t('update.soft_versions', { current, latest })}</Text>
              </View>
            </View>
            <Text className="text-sm text-neutral-600 leading-relaxed">{t('update.soft_body')}</Text>

            {data.releaseNotes ? (
              <View className="bg-neutral-50 rounded-2xl p-4 mt-4">
                <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  {t('update.release_notes')}
                </Text>
                <Text className="text-sm text-neutral-700 leading-relaxed">{data.releaseNotes}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row gap-3 px-6 pt-4">
            <Pressable
              onPress={later}
              accessibilityRole="button"
              className="flex-1 py-3.5 rounded-2xl border border-neutral-200 items-center"
            >
              <Text className="text-sm font-semibold text-neutral-700">{t('update.soft_later')}</Text>
            </Pressable>
            {data.downloadUrl ? (
              <Pressable
                onPress={update}
                accessibilityRole="button"
                className="flex-1 py-3.5 rounded-2xl bg-brand-500 flex-row items-center justify-center gap-2"
              >
                <ArrowDownToLine size={18} color="#fff" />
                <Text className="text-sm font-bold text-white">{t('update.soft_update')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
