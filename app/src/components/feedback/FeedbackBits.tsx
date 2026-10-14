import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FeedbackStatus, FeedbackTipe } from '@/api/feedback';

const STATUS_CLS: Record<FeedbackStatus, { bg: string; text: string }> = {
  BARU: { bg: 'bg-neutral-100', text: 'text-neutral-600' },
  DIPROSES: { bg: 'bg-amber-100', text: 'text-amber-800' },
  SELESAI: { bg: 'bg-green-100', text: 'text-green-700' },
};

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const { t } = useTranslation();
  const c = STATUS_CLS[status];
  return (
    <View className={`px-2 py-0.5 rounded-full ${c.bg}`}>
      <Text className={`text-[10px] font-bold ${c.text}`}>{t(`feedback.status_${status}`)}</Text>
    </View>
  );
}

export function FeedbackTipeBadge({ tipe }: { tipe: FeedbackTipe }) {
  const { t } = useTranslation();
  const kritik = tipe === 'KRITIK';
  return (
    <View className={`px-1.5 py-0.5 rounded ${kritik ? 'bg-rose-100' : 'bg-sky-100'}`}>
      <Text className={`text-[10px] font-bold ${kritik ? 'text-rose-700' : 'text-sky-700'}`}>
        {kritik ? t('feedback.tipe_KRITIK') : t('feedback.tipe_SARAN')}
      </Text>
    </View>
  );
}

export const fmtFeedbackDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
