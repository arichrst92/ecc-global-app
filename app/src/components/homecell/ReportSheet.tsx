/**
 * Laporan PDF Homecell / Homecell Area untuk pemimpin & PIC area.
 * Pilih periode → server membuat link laporan (berlaku 30 menit) → dibuka di
 * browser dalam app (print view). Dari sana: Bagikan / Cetak → Simpan PDF.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FileText, X } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';

import { createHomecellReportLink, type ReportPeriode } from '@/api/homecell';
import { ApiError } from '@/types/api';
import { nc } from '@/theme/ThemeRoot';

const PERIODS: ReportPeriode[] = ['last_7d', 'this_week', 'last_week', 'last_30d', 'this_month', 'last_month', 'all'];

export function ReportSheet({
  visible,
  onClose,
  kind,
  id,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  kind: 'homecell' | 'area';
  id: string;
  title: string;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [periode, setPeriode] = useState<ReportPeriode>('last_30d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await createHomecellReportLink({
        kind,
        id,
        periode: periode === 'all' ? undefined : periode,
        lang: i18n.language?.startsWith('en') ? 'en' : 'id',
      });
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url, { toolbarColor: '#F97316', showTitle: true, enableBarCollapsing: false });
      }
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error.network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-5 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-neutral-900 flex-1" numberOfLines={1}>
            {t('hcj.report_title')}
          </Text>
          <Pressable onPress={onClose} className="w-9 h-9 items-center justify-center" accessibilityLabel={t('common.close')}>
            <X size={20} color={nc('#525252')} />
          </Pressable>
        </View>
        <Text className="text-xs text-neutral-500 mb-4" numberOfLines={1}>
          {title}
        </Text>

        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('hcj.report_period')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {PERIODS.map((p) => {
            const on = p === periode;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriode(p)}
                className={`px-3 py-2 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
              >
                <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{t(`hcj.period_${p}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-[11px] text-neutral-500 mt-4 leading-relaxed">{t('hcj.report_hint')}</Text>
        {error ? <Text className="text-xs text-red-600 mt-2">{error}</Text> : null}

        <Pressable
          onPress={open}
          disabled={busy}
          className="mt-4 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-500"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <FileText size={18} color="#fff" />}
          <Text className="text-sm font-bold text-white">{t('hcj.report_open')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
