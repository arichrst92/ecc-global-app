/** Saklar "Bantu tingkatkan Els App (analitik anonim)" — di Pengaturan → Privasi. */
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react-native';

import { isAnalyticsEnabled, setAnalyticsEnabled } from './tracker';
import { nc } from '@/theme/ThemeRoot';

export function AnalyticsToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    void isAnalyticsEnabled().then(setOn);
  }, []);
  return (
    <View className="bg-card rounded-2xl border border-neutral-100 p-4 mb-4 flex-row gap-3 items-start">
      <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
        <BarChart3 size={18} color={nc('#525252')} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-neutral-900">{t('privacy.analytics_title')}</Text>
        <Text className="text-xs text-neutral-500 mt-0.5 leading-5">{t('privacy.analytics_body')}</Text>
      </View>
      <Switch
        value={on ?? true}
        disabled={on == null}
        onValueChange={(v) => {
          setOn(v);
          void setAnalyticsEnabled(v);
        }}
        trackColor={{ true: '#F97316' }}
      />
    </View>
  );
}
