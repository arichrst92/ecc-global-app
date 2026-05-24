import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Share2 } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';
import { useRenunganDetail, useRenunganList } from '@/hooks/useContent';
import { formatDate } from '@/utils/date';

export default function RenunganDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detailQuery = useRenunganDetail(id);
  const item = detailQuery.data;
  // Prev/next computed dari list (sorted desc by tanggal di BE).
  // Pakai list untuk navigasi lokal tanpa extra round-trip per click.
  const listQuery = useRenunganList(30);

  const { prevSlug, nextSlug } = useMemo(() => {
    const list = listQuery.data ?? [];
    if (!item || list.length === 0) return { prevSlug: null, nextSlug: null };
    const idx = list.findIndex((r) => r.id === item.id || r.slug === item.slug);
    if (idx === -1) return { prevSlug: null, nextSlug: null };
    // List sorted desc by tanggal — idx-1 = renungan lebih baru (next chronologically),
    // idx+1 = renungan lebih lama (prev chronologically).
    // UI convention: "Sebelumnya" = renungan yang lebih lama, "Berikutnya" = lebih baru.
    const newer = idx > 0 ? list[idx - 1] : null;
    const older = idx < list.length - 1 ? list[idx + 1] : null;
    return {
      nextSlug: newer ? newer.slug || newer.id : null,
      prevSlug: older ? older.slug || older.id : null,
    };
  }, [item, listQuery.data]);

  async function handleShare() {
    if (!item) return;
    try {
      await Share.share({
        title: item.judul,
        message: `📖 ${item.ayatAlkitab}\n\n*${item.judul}*\n\n${item.ringkasan}\n\n— Els App`,
      });
    } catch {
      // user cancel — ignore
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
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

        {detailQuery.isPending ? (
          <View className="h-72 items-center justify-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : detailQuery.isError ? (
          <View className="items-center py-20 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => detailQuery.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : item ? (
          <>
            <HeroImage
              url={item.heroImageUrl}
              fallbackEmoji="📖"
              emojiSize={96}
              className="h-60"
            />

            <View className="px-5 pt-5 pb-3">
              {/* Ayat banner */}
              <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-brand-500 items-center justify-center">
                  <BookOpen size={18} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                    {t('content.bible_verse')}
                  </Text>
                  <Text className="text-base font-bold text-brand-700">{item.ayatAlkitab}</Text>
                </View>
              </View>

              <Text className="text-2xl font-bold text-neutral-900 leading-tight mb-2">
                {item.judul}
              </Text>
              <View className="flex-row items-center gap-2 mb-4">
                <Calendar size={14} color="#737373" />
                <Text className="text-xs text-neutral-500">
                  {formatDate(item.tanggal, lang)}
                </Text>
              </View>

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

      {/* Bottom prev/next nav */}
      {item ? (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row px-3 py-2 gap-2">
              <NavButton
                label={t('content.prev')}
                direction="prev"
                disabled={!prevSlug}
                onPress={() => prevSlug && router.replace(`/content/renungan/${prevSlug}`)}
              />
              <NavButton
                label={t('content.next')}
                direction="next"
                disabled={!nextSlug}
                onPress={() => nextSlug && router.replace(`/content/renungan/${nextSlug}`)}
              />
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}

function NavButton({
  label,
  direction,
  disabled,
  onPress,
}: {
  label: string;
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
        disabled ? 'bg-neutral-100' : 'bg-brand-50 border border-brand-200'
      }`}
    >
      {direction === 'prev' ? <Icon size={16} color={disabled ? '#A3A3A3' : '#EA580C'} /> : null}
      <Text
        className={`text-sm font-semibold ${disabled ? 'text-neutral-400' : 'text-brand-700'}`}
      >
        {label}
      </Text>
      {direction === 'next' ? <Icon size={16} color={disabled ? '#A3A3A3' : '#EA580C'} /> : null}
    </Pressable>
  );
}
