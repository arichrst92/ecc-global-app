/**
 * Privacy Policy page — fetch dari BE /public/legal/PRIVACY.
 * Per BE patch 22b.
 */
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react-native';

import { MarkdownView } from '@/components/ui/MarkdownView';
import { useLegalDocument } from '@/hooks/useLegal';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useLegalDocument('PRIVACY');
  const doc = query.data;

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {doc?.title ?? t('legal.privacy_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-2">
            <Shield size={28} color="#2563EB" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {doc?.title ?? t('legal.privacy_title')}
          </Text>
          <Text className="text-xs text-neutral-500 text-center mt-1">
            ECC Global App
          </Text>
        </View>

        {query.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#F97316" />
            <Text className="text-xs text-neutral-500 mt-2">
              {t('common.loading')}
            </Text>
          </View>
        ) : query.isError ? (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Text className="text-sm font-bold text-amber-700 mb-1">
              {t('legal.fetch_error_title')}
            </Text>
            <Text className="text-xs text-amber-700 leading-relaxed mb-3">
              {t('legal.fetch_error_msg')}
            </Text>
            <Pressable
              onPress={() => query.refetch()}
              className="bg-brand-500 rounded-full px-4 py-2 self-start"
            >
              <Text className="text-xs font-bold text-white">
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : doc ? (
          <>
            <View className="bg-white rounded-2xl p-4 border border-neutral-100">
              <MarkdownView content={doc.content} />
            </View>
            <Text className="text-xs text-neutral-400 text-center mt-4">
              {t('legal.last_updated', { date: doc.version })}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
