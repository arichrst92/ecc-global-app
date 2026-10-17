/** Kirim Kritik & Saran — tipe, topik, isi. */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { ArrowLeft, Lightbulb, MessageSquareWarning } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { FEEDBACK_KATEGORI, sendFeedback, type FeedbackKategori, type FeedbackTipe } from '@/api/feedback';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';

export default function NewFeedbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [tipe, setTipe] = useState<FeedbackTipe>('SARAN');
  const [kategori, setKategori] = useState<FeedbackKategori>('APLIKASI');
  const [isi, setIsi] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      sendFeedback({
        tipe,
        kategori,
        isi: isi.trim(),
        appInfo: `${Platform.OS} · v${(Constants.expoConfig?.version as string | undefined) ?? '-'}`,
      }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ['feedback', 'mine'] });
      showToast(t('feedback.sent'), 'success');
      router.replace(`/feedback/${f.id}` as never);
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });

  const tipeOpt: { key: FeedbackTipe; Icon: typeof Lightbulb }[] = [
    { key: 'SARAN', Icon: Lightbulb },
    { key: 'KRITIK', Icon: MessageSquareWarning },
  ];
  const len = isi.trim().length;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('feedback.new_title')}</Text>
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text className="text-sm text-neutral-600 leading-5">{t('feedback.new_intro')}</Text>

          <Text className="text-sm font-semibold text-neutral-800">{t('feedback.tipe_label')}</Text>
          <View className="flex-row gap-2">
            {tipeOpt.map(({ key, Icon }) => {
              const on = tipe === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTipe(key)}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border ${
                    on ? 'bg-brand-50 border-brand-400' : 'bg-white border-neutral-200'
                  }`}
                >
                  <Icon size={18} color={on ? '#EA580C' : '#737373'} />
                  <Text className={`text-sm font-semibold ${on ? 'text-brand-700' : 'text-neutral-700'}`}>{t(`feedback.tipe_${key}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-sm font-semibold text-neutral-800">{t('feedback.kategori_label')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {FEEDBACK_KATEGORI.map((k) => {
              const on = kategori === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKategori(k)}
                  className={`px-3 py-1.5 rounded-full border ${on ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-300'}`}
                >
                  <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-neutral-700'}`}>{t(`feedback.kategori_${k}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-sm font-semibold text-neutral-800">{t('feedback.isi_label')}</Text>
          <TextInput
            value={isi}
            onChangeText={setIsi}
            multiline
            maxLength={3000}
            placeholder={tipe === 'KRITIK' ? t('feedback.isi_ph_kritik') : t('feedback.isi_ph_saran')}
            placeholderTextColor="#A3A3A3"
            className="bg-white rounded-2xl px-4 py-3 text-sm text-neutral-900 border border-neutral-200"
            style={{ minHeight: 160, textAlignVertical: 'top' }}
          />
          <Text className="text-[11px] text-neutral-400 -mt-2 text-right">{isi.length}/3000</Text>

          <Button label={t('feedback.send')} loading={mut.isPending} disabled={len < 10} onPress={() => mut.mutate()} fullWidth size="lg" />
          <Text className="text-[11px] text-neutral-500 text-center">{t('feedback.privacy_note')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
