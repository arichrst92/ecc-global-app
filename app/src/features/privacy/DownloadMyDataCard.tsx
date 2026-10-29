/** Pengaturan → Privasi → "Unduh data saya" (kepatuhan no. 6 · portabilitas). */
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react-native';

import { getMyDataExport } from '@/api/myData';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

async function saveJson(fileName: string, json: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const [FileSystem, Sharing] = await Promise.all([import('expo-file-system/legacy'), import('expo-sharing')]);
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' });
}

export function DownloadMyDataCard() {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const data = await getMyDataExport();
      const stamp = new Date().toISOString().slice(0, 10);
      await saveJson(`data-saya-els-app-${stamp}.json`, JSON.stringify(data, null, 2));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('error.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={busy ? undefined : run} className="bg-card rounded-2xl border border-neutral-100 p-4 mb-4 flex-row gap-3 items-start">
      <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
        <Download size={18} color={nc('#525252')} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-neutral-900">{t('privacy.export_title')}</Text>
        <Text className="text-xs text-neutral-500 mt-0.5 leading-5">{t('privacy.export_body')}</Text>
      </View>
      {busy ? <ActivityIndicator color="#F97316" /> : <Text className="text-xs font-bold text-brand-600 mt-1">{t('privacy.export_btn')}</Text>}
    </Pressable>
  );
}
