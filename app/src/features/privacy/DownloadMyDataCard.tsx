/**
 * Pengaturan → Privasi → "Unduh data saya" (kepatuhan no. 6 · hak akses &
 * portabilitas). Membuka salinan data pribadi sebagai PDF (print view,
 * format sama dengan Export PDF di Portal → detail jemaat) lewat link
 * bertanda tangan 10 menit.
 */
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';

import { createMyDataLink } from '@/api/myData';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

export function DownloadMyDataCard() {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    // Web: buka tab dulu dalam gesture pengguna supaya tidak diblokir popup.
    const tab = Platform.OS === 'web' ? window.open('', '_blank') : null;
    try {
      const { url } = await createMyDataLink();
      if (Platform.OS === 'web') {
        if (tab) tab.location.href = url;
        else window.location.href = url;
      } else {
        await WebBrowser.openBrowserAsync(url, { toolbarColor: '#F97316', showTitle: true, enableBarCollapsing: false });
      }
    } catch (err) {
      tab?.close();
      showToast(err instanceof ApiError ? err.message : t('error.network'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={busy ? undefined : run} className="bg-card rounded-2xl border border-neutral-100 p-4 mb-4 flex-row gap-3 items-start">
      <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
        <FileText size={18} color={nc('#525252')} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-neutral-900">{t('privacy.export_title')}</Text>
        <Text className="text-xs text-neutral-500 mt-0.5 leading-5">{t('privacy.export_body')}</Text>
      </View>
      {busy ? <ActivityIndicator color="#F97316" /> : <Text className="text-xs font-bold text-brand-600 mt-1">{t('privacy.export_btn')}</Text>}
    </Pressable>
  );
}
