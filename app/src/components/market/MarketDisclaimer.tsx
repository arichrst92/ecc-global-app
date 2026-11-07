/** Pernyataan Local Market: ECC hanya memfasilitasi, tanpa keuntungan (2.4.7). */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react-native';

import { nc } from '@/theme/ThemeRoot';

export function MarketDisclaimer({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <View className={`flex-row items-start gap-2 bg-neutral-100 rounded-xl px-3 py-2.5 ${className}`}>
      <Info size={14} color={nc('#737373')} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-[11px] leading-4 text-neutral-600">{t('market.disclaimer')}</Text>
    </View>
  );
}
