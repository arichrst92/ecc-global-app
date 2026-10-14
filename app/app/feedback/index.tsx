/** Kritik & Saran saya — daftar kiriman + tombol kirim baru. */
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, MessageSquareText, Plus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { listMyFeedback } from '@/api/feedback';
import { FeedbackStatusBadge, FeedbackTipeBadge, fmtFeedbackDate } from '@/components/feedback/FeedbackBits';

export default function MyFeedbackScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['feedback', 'mine'], queryFn: listMyFeedback });
  const rows = q.data ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('feedback.title')}</Text>
            <Text className="text-xs text-neutral-500">{t('feedback.subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.push('/feedback/new' as never)} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <Plus size={22} color="#EA580C" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor="#F97316" />}
      >
        {q.isPending ? (
          <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
        ) : rows.length === 0 ? (
          <View className="items-center py-14 px-6">
            <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-3">
              <MessageSquareText size={26} color="#EA580C" />
            </View>
            <Text className="text-base font-bold text-neutral-900 text-center">{t('feedback.empty_title')}</Text>
            <Text className="text-sm text-neutral-500 text-center mt-1 mb-5">{t('feedback.empty_body')}</Text>
            <Button label={t('feedback.send_new')} onPress={() => router.push('/feedback/new' as never)} />
          </View>
        ) : (
          <>
            {rows.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => router.push(`/feedback/${f.id}` as never)}
                className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
              >
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2 mb-1">
                    <FeedbackTipeBadge tipe={f.tipe} />
                    <Text className="text-[11px] text-neutral-500">{t(`feedback.kategori_${f.kategori}`)}</Text>
                    <View className="flex-1" />
                    <FeedbackStatusBadge status={f.status} />
                  </View>
                  <Text className="text-sm text-neutral-800" numberOfLines={2}>
                    {f.isi}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-[11px] text-neutral-400">{fmtFeedbackDate(f.lastActivityAt, i18n.language)}</Text>
                    {f.unreadForUser ? (
                      <View className="bg-brand-500 rounded-full px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-white">{t('feedback.new_reply')}</Text>
                      </View>
                    ) : f.replyCount > 0 ? (
                      <Text className="text-[11px] text-neutral-400">· {t('feedback.reply_count', { count: f.replyCount })}</Text>
                    ) : null}
                  </View>
                </View>
                <ChevronRight size={16} color="#A3A3A3" />
              </Pressable>
            ))}
            <View className="mt-2">
              <Button label={t('feedback.send_new')} variant="secondary" onPress={() => router.push('/feedback/new' as never)} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
