/**
 * Privasi — atur siapa saja yang boleh melihat data pribadi saya.
 * Per data: centang kelompok (keluarga, homecell, area, group, pelayanan,
 * cabang, semua jemaat). Tidak ada yang dicentang = hanya saya.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  PRIVACY_AUDIENCES,
  PRIVACY_FIELDS,
  getMyPrivacy,
  updateMyPrivacy,
  type PrivacyAudience,
  type PrivacyField,
  type PrivacySettings,
} from '@/api/privacy';
import { goBack } from '@/utils/nav';

const KEY = ['me', 'privacy'] as const;

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey: KEY, queryFn: getMyPrivacy });

  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [discoverable, setDiscoverable] = useState(true);
  useEffect(() => {
    if (q.data) {
      setSettings(q.data.settings);
      setDiscoverable(q.data.discoverableByPhone);
    }
  }, [q.data]);

  const dirty = useMemo(() => {
    if (!q.data || !settings) return false;
    return (
      discoverable !== q.data.discoverableByPhone ||
      PRIVACY_FIELDS.some((f) => [...settings[f]].sort().join() !== [...q.data!.settings[f]].sort().join())
    );
  }, [q.data, settings, discoverable]);

  const save = useMutation({
    mutationFn: () => updateMyPrivacy({ settings: settings!, discoverableByPhone: discoverable }),
    onSuccess: (data) => {
      qc.setQueryData(KEY, (old: typeof q.data) => ({ ...old, ...data }));
      showToast(t('privacy.saved'), 'success');
    },
    onError: () => showToast(t('error.generic'), 'error'),
  });

  function toggle(field: PrivacyField, a: PrivacyAudience) {
    setSettings((s) => {
      if (!s) return s;
      const cur = s[field];
      const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
      return { ...s, [field]: next };
    });
  }

  function resetDefault() {
    if (q.data?.defaults) setSettings(q.data.defaults);
    setDiscoverable(true);
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">{t('privacy.title')}</Text>
          {q.data?.defaults ? (
            <Pressable onPress={resetDefault} className="px-2 py-1">
              <Text className="text-xs font-semibold text-brand-600">{t('privacy.reset')}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {!settings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16, paddingTop: 16 }}
          >
            <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex-row gap-3">
              <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
                <ShieldCheck size={18} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-brand-900">{t('privacy.intro_title')}</Text>
                <Text className="text-xs text-brand-800 mt-1 leading-5">{t('privacy.intro_body')}</Text>
              </View>
            </View>

            {PRIVACY_FIELDS.map((f) => {
              const sel = settings[f];
              const all = sel.includes('SEMUA');
              const summary = all
                ? t('privacy.aud_SEMUA')
                : sel.length === 0
                  ? t('privacy.only_me')
                  : PRIVACY_AUDIENCES.filter((a) => sel.includes(a))
                      .map((a) => t(`privacy.aud_${a}`))
                      .join(', ');
              return (
                <View key={f} className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3">
                  <Text className="text-sm font-bold text-neutral-900">{t(`privacy.field_${f}`)}</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{t(`privacy.field_${f}_sub`)}</Text>
                  <View className="flex-row items-center gap-1.5 mt-2">
                    {sel.length === 0 ? <Lock size={12} color="#737373" /> : null}
                    <Text className="text-xs font-semibold text-neutral-700 flex-1" numberOfLines={2}>
                      {t('privacy.visible_to')}: {summary}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {PRIVACY_AUDIENCES.map((a) => {
                      const on = sel.includes(a);
                      const implied = all && a !== 'SEMUA';
                      return (
                        <Pressable
                          key={a}
                          onPress={() => toggle(f, a)}
                          disabled={implied}
                          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                            on || implied ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-200'
                          } ${implied ? 'opacity-50' : ''}`}
                        >
                          {on || implied ? <Check size={12} color="#fff" /> : null}
                          <Text className={`text-xs font-semibold ${on || implied ? 'text-white' : 'text-neutral-700'}`}>
                            {t(`privacy.aud_${a}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3 flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-900">{t('privacy.discoverable')}</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{t('privacy.discoverable_sub')}</Text>
              </View>
              <Switch
                value={discoverable}
                onValueChange={setDiscoverable}
                trackColor={{ true: '#F97316', false: '#D4D4D4' }}
                thumbColor="#fff"
              />
            </View>

            <Text className="text-[11px] text-neutral-500 leading-4 px-1">{t('privacy.footnote')}</Text>
          </ScrollView>

          <View
            className="absolute left-0 right-0 bottom-0 bg-white border-t border-neutral-100 px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <Button
              label={t('privacy.save')}
              onPress={() => save.mutate()}
              loading={save.isPending}
              disabled={!dirty}
              fullWidth
            />
          </View>
        </>
      )}
    </View>
  );
}
