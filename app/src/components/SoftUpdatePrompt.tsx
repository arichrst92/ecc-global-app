/**
 * Pemberitahuan update TIDAK wajib — muncul kalau ada versi baru di store
 * (BE updateAvailable=true) tapi versi terpasang masih didukung
 * (forceUpdate=false; yang wajib ditangani ForceUpdateModal).
 *
 * Muncul sekali per versi: tombol "Nanti" menyimpan versi yang dilewati, jadi
 * baru muncul lagi kalau admin publish versi yang lebih baru. Ketuk area gelap
 * / tombol back hanya MENUTUP (tidak dicatat sebagai "Nanti") supaya ketukan
 * tak sengaja tidak menyembunyikan update sampai versi berikutnya.
 *
 * Desain 2.4.4: bottom sheet dengan kepala oranye brand (logo + versi),
 * catatan rilis bercentang sesuai bahasa app, tombol Nanti / Perbarui di-pin.
 * Backdrop adalah Pressable TERPISAH (bukan membungkus sheet) supaya gesture
 * scroll di dalam sheet tidak "dicuri" responder Pressable di Android.
 */
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, X } from 'lucide-react-native';

import { useAppVersion } from '@/hooks/useAppVersion';
import { gx } from '@/theme/gradient';
import { AppLogo, ReleaseNotes, VersionPill, releaseNotesFor, storeUrlFor } from '@/components/update/shared';

const DISMISS_KEY = 'app-update.dismissed-version';

export function SoftUpdatePrompt() {
  const { t, i18n } = useTranslation();
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

  /** Tutup saja (muncul lagi saat app dibuka berikutnya). */
  function close() {
    setVisible(false);
  }

  /** "Nanti" — lewati versi ini. */
  function later() {
    setVisible(false);
    if (latest) AsyncStorage.setItem(DISMISS_KEY, latest).catch(() => {});
  }

  function update() {
    setVisible(false);
    Linking.openURL(storeUrlFor(data!)).catch(() => {});
  }

  const current = Constants.expoConfig?.version ?? '';
  const notes = releaseNotesFor(data, i18n.language);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View className="flex-1 justify-end">
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />

        <View
          className="bg-card rounded-t-3xl w-full max-w-md self-center overflow-hidden"
          style={{ maxHeight: height * 0.88, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {/* Kepala oranye */}
          <View {...gx('bg-brand-500 px-6 pt-3 pb-6 items-center')}>
            <View className="w-10 h-1 bg-white/40 rounded-full mb-4" />
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={10}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 items-center justify-center"
            >
              <X size={16} color="#fff" />
            </Pressable>
            <AppLogo size={60} />
            <Text className="text-white text-xl font-bold text-center mt-3">{t('update.soft_title')}</Text>
            <View className="mt-2">
              <VersionPill current={current} latest={latest} />
            </View>
          </View>

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 4 }}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
          >
            <Text className="text-sm text-neutral-600 text-center leading-relaxed">{t('update.soft_body')}</Text>
            {notes ? (
              <View className="mt-4">
                <ReleaseNotes text={notes} />
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row gap-3 px-6 pt-4">
            <Pressable
              onPress={later}
              accessibilityRole="button"
              className="flex-1 py-3.5 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <Text className="text-sm font-semibold text-neutral-700">{t('update.soft_later')}</Text>
            </Pressable>
            <Pressable
              onPress={update}
              accessibilityRole="button"
              {...gx('py-3.5 rounded-2xl bg-brand-500 flex-row items-center justify-center gap-2', { flex: 1.4 })}
            >
              <ArrowDownToLine size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('update.soft_update')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
