/**
 * Pemberitahuan update TIDAK wajib — muncul kalau ada versi baru di store
 * (BE updateAvailable=true) tapi versi terpasang masih didukung
 * (forceUpdate=false; yang wajib ditangani ForceUpdateModal).
 *
 * Muncul sekali per versi: "Nanti" menyimpan versi yang dilewati, jadi
 * baru muncul lagi kalau admin publish versi yang lebih baru.
 * Data dari menu App Versions di portal (GET /public/app-version).
 */
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, Sparkles } from 'lucide-react-native';

import { useAppVersion } from '@/hooks/useAppVersion';

const DISMISS_KEY = 'app-update.dismissed-version';

export function SoftUpdatePrompt() {
  const { t } = useTranslation();
  const { data } = useAppVersion();
  const [visible, setVisible] = useState(false);

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
      <Pressable onPress={later} className="flex-1 bg-black/50 justify-end">
        <Pressable onPress={() => {}} className="bg-white rounded-t-3xl px-6 pt-3 pb-8" style={{ maxHeight: '80%' }}>
          <View className="items-center mb-4">
            <View className="w-10 h-1 bg-neutral-300 rounded-full" />
          </View>
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center">
              <Sparkles size={24} color="#EA580C" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-bold text-neutral-900">{t('update.soft_title')}</Text>
              <Text className="text-xs text-neutral-500">
                {t('update.soft_versions', { current, latest })}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-neutral-600 leading-relaxed">{t('update.soft_body')}</Text>

          {data.releaseNotes ? (
            <View className="bg-neutral-50 rounded-2xl p-4 mt-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                {t('update.release_notes')}
              </Text>
              <ScrollView style={{ maxHeight: 220 }}>
                <Text className="text-sm text-neutral-700 leading-relaxed">{data.releaseNotes}</Text>
              </ScrollView>
            </View>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <Pressable onPress={later} className="flex-1 py-3.5 rounded-2xl border border-neutral-200 items-center">
              <Text className="text-sm font-semibold text-neutral-700">{t('update.soft_later')}</Text>
            </Pressable>
            {data.downloadUrl ? (
              <Pressable
                onPress={update}
                className="flex-1 py-3.5 rounded-2xl bg-brand-500 flex-row items-center justify-center gap-2"
              >
                <ArrowDownToLine size={18} color="#fff" />
                <Text className="text-sm font-bold text-white">{t('update.soft_update')}</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
