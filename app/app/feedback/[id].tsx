/** Detail Kritik & Saran — percakapan dengan tim gereja + tanggapan lanjutan. */
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send } from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { getMyFeedback, replyMyFeedback } from '@/api/feedback';
import { FeedbackStatusBadge, FeedbackTipeBadge, fmtFeedbackDate } from '@/components/feedback/FeedbackBits';
import { ApiError } from '@/types/api';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';

export default function FeedbackDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isi, setIsi] = useState('');

  const q = useQuery({
    queryKey: ['feedback', 'detail', id],
    queryFn: async () => {
      const d = await getMyFeedback(id);
      // Detail menandai balasan terbaca → segarkan daftar.
      qc.invalidateQueries({ queryKey: ['feedback', 'mine'] });
      return d;
    },
    enabled: !!id,
  });
  const mut = useMutation({
    mutationFn: () => replyMyFeedback(id, isi.trim()),
    onSuccess: () => {
      setIsi('');
      q.refetch();
    },
    onError: (e) => showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error'),
  });
  const f = q.data;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1">{t('feedback.detail_title')}</Text>
          {f ? <FeedbackStatusBadge status={f.status} /> : null}
        </View>
      </SafeAreaView>

      {!f ? (
        <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            <View className="bg-white rounded-2xl p-4 border border-neutral-100">
              <View className="flex-row items-center gap-2 mb-2">
                <FeedbackTipeBadge tipe={f.tipe} />
                <Text className="text-[11px] text-neutral-500">{t(`feedback.kategori_${f.kategori}`)}</Text>
                <View className="flex-1" />
                <Text className="text-[11px] text-neutral-400">{fmtFeedbackDate(f.createdAt, i18n.language)}</Text>
              </View>
              <Text className="text-sm text-neutral-800 leading-5">{f.isi}</Text>
            </View>

            {f.replies.length === 0 ? (
              <Text className="text-xs text-neutral-500 text-center mt-2">{t('feedback.waiting')}</Text>
            ) : null}

            {f.replies.map((r) => (
              <View key={r.id} className={`flex-row ${r.fromAdmin ? 'justify-start' : 'justify-end'}`}>
                <View
                  {...gx(`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    r.fromAdmin ? 'bg-white border border-brand-100' : 'bg-brand-500'
                  }`)}
                >
                  {r.fromAdmin ? <Text className="text-[11px] font-bold text-brand-700 mb-0.5">{t('feedback.church_team')}</Text> : null}
                  <Text className={`text-sm leading-5 ${r.fromAdmin ? 'text-neutral-800' : 'text-white'}`}>{r.isi}</Text>
                  <Text className={`text-[10px] mt-1 ${r.fromAdmin ? 'text-neutral-400' : 'text-white/75'}`}>
                    {fmtFeedbackDate(r.createdAt, i18n.language)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="bg-white border-t border-neutral-100 px-4 pt-3" style={{ paddingBottom: insets.bottom + 10 }}>
            <View className="flex-row items-end gap-2">
              <TextInput
                value={isi}
                onChangeText={setIsi}
                multiline
                maxLength={3000}
                placeholder={t('feedback.reply_ph')}
                placeholderTextColor="#A3A3A3"
                className="flex-1 bg-neutral-50 rounded-2xl px-4 py-2.5 text-sm text-neutral-900 border border-neutral-200"
                style={{ maxHeight: 120 }}
              />
              <Pressable
                onPress={() => mut.mutate()}
                disabled={!isi.trim() || mut.isPending}
                {...gx(`w-11 h-11 rounded-full items-center justify-center ${isi.trim() ? 'bg-brand-500' : 'bg-neutral-200'}`)}
              >
                {mut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
