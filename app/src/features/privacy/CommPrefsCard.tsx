/** Pengaturan → Privasi → "Pesan WhatsApp" (kepatuhan no. 19). */
import { Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react-native';

import { getCommPrefs, updateCommPrefs, type CommPrefs } from '@/api/myData';
import { useToast } from '@/components/ui/Toast';
import { nc } from '@/theme/ThemeRoot';

const ROWS: { key: keyof CommPrefs; label: string; sub: string }[] = [
  { key: 'waReminders', label: 'privacy.wa_reminders', sub: 'privacy.wa_reminders_sub' },
  { key: 'waGreetings', label: 'privacy.wa_greetings', sub: 'privacy.wa_greetings_sub' },
  { key: 'waUpdates', label: 'privacy.wa_updates', sub: 'privacy.wa_updates_sub' },
];

export function CommPrefsCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey: ['comm-prefs'], queryFn: getCommPrefs });
  const m = useMutation({
    mutationFn: updateCommPrefs,
    onMutate: async (patch) => {
      const prev = qc.getQueryData<CommPrefs>(['comm-prefs']);
      if (prev) qc.setQueryData(['comm-prefs'], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comm-prefs'], ctx.prev);
      showToast(t('error.generic'), 'error');
    },
    onSuccess: (data) => qc.setQueryData(['comm-prefs'], data),
  });

  return (
    <View className="bg-card rounded-2xl border border-neutral-100 p-4 mb-4">
      <View className="flex-row gap-3 items-start mb-2">
        <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
          <MessageCircle size={18} color={nc('#525252')} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-neutral-900">{t('privacy.wa_title')}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5 leading-5">{t('privacy.wa_body')}</Text>
        </View>
      </View>
      {ROWS.map((r) => (
        <View key={r.key} className="flex-row items-center gap-3 py-2 border-t border-neutral-100">
          <View className="flex-1">
            <Text className="text-sm text-neutral-900">{t(r.label)}</Text>
            <Text className="text-[11px] text-neutral-500">{t(r.sub)}</Text>
          </View>
          <Switch
            value={q.data?.[r.key] ?? true}
            disabled={!q.data}
            onValueChange={(v) => m.mutate({ [r.key]: v })}
            trackColor={{ true: '#F97316' }}
          />
        </View>
      ))}
    </View>
  );
}
