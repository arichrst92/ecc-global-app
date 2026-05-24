import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, MapPin, Share2, User } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';
import { useNewsDetail } from '@/hooks/useContent';
import { formatDate } from '@/utils/date';

export default function NewsDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useNewsDetail(id);
  const item = query.data;

  async function handleShare() {
    if (!item) return;
    try {
      await Share.share({
        title: item.judul,
        message: `${item.judul}\n\n${item.ringkasan}\n\n— Els App`,
      });
    } catch {
      // user cancel — ignore
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Floating header */}
        <View className="absolute top-0 left-0 right-0 z-10" pointerEvents="box-none">
          <SafeAreaView edges={['top']}>
            <View className="px-4 py-2 flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <ArrowLeft size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <Share2 size={18} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {query.isPending ? (
          <View className="h-72 items-center justify-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-20 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => query.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : item ? (
          <>
            <HeroImage url={item.heroImageUrl} fallbackEmoji="📰" emojiSize={96} className="h-72" />

            <View className="px-5 pt-5 pb-3">
              <Text className="text-2xl font-bold text-neutral-900 leading-tight mb-3">
                {item.judul}
              </Text>

              {/* Meta */}
              <View className="gap-1.5 mb-4">
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#737373" />
                  <Text className="text-xs text-neutral-500">
                    {formatDate(item.publishedAt, lang)}
                  </Text>
                </View>
                {item.cabang ? (
                  <View className="flex-row items-center gap-2">
                    <MapPin size={14} color="#737373" />
                    <Text className="text-xs text-neutral-500">{item.cabang.nama}</Text>
                  </View>
                ) : null}
                {item.author ? (
                  <View className="flex-row items-center gap-2">
                    <User size={14} color="#737373" />
                    <Text className="text-xs text-neutral-500">
                      {item.author.jemaat.namaLengkap}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Tags */}
              {item.tags && item.tags.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <View key={tag} className="px-2.5 py-1 bg-neutral-100 rounded-full">
                      <Text className="text-xs text-neutral-600">#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Ringkasan */}
              <Text className="text-base text-neutral-600 italic leading-relaxed mb-4">
                {item.ringkasan}
              </Text>

              <View className="h-px bg-neutral-200 mb-4" />

              {/* Konten markdown */}
              <SimpleMarkdown source={item.konten} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
