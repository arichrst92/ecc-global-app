import { useState } from 'react';
import { FormCards } from '@/components/forms/FormCards';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { formatInstantDate } from '@/utils/time';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';
import { useNewsDetail, useNewsList } from '@/hooks/useContent';
import { useBookmarksStore } from '@/stores/bookmarks.store';
import { buildNewsShareUrl } from '@/utils/share';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { ShareCardModal } from '@/features/share/ShareCardModal';
import { ArticleShareCard } from '@/features/share/cards';
import { ArticleTopBar, EndActions, LeadParagraph, ReadTime, readingMinutes, useArticleScroll } from '@/components/content/ArticleBits';

export default function NewsDetailScreen() {
  const { width } = useWindowDimensions();
  const art = useArticleScroll(width / 1.5);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useNewsDetail(id);
  const item = query.data;
  const listQ = useNewsList(10);
  const more = (listQ.data ?? []).filter((n) => n.id !== item?.id && n.slug !== item?.slug).slice(0, 3);

  const toggleBookmark = useBookmarksStore((s) => s.toggle);
  const bookmarked = useBookmarksStore((s) => (item ? s.isBookmarked('NEWS', item.id) : false));

  function handleToggleBookmark() {
    if (!item) return;
    toggleBookmark({
      id: item.id,
      tipe: 'NEWS',
      judul: item.judul,
      slug: item.slug,
      ringkasan: item.ringkasan,
      heroImageUrl: item.heroImageUrl,
      publishedAt: item.publishedAt,
    });
  }

  const [share, setShare] = useState<{ caption: string; badge: string | null } | null>(null);

  async function handleShare() {
    if (!item) return;
    try {
      // Format tanggal human-readable + Universal Link untuk buka di app
      const publishDate = item.publishedAt
        ? formatInstantDate(item.publishedAt, lang)
        : '';
      const parts: string[] = [item.judul];
      if (publishDate) parts.push(`📅 ${publishDate}`);
      parts.push('');
      parts.push(item.ringkasan);
      parts.push('');
      parts.push(buildNewsShareUrl(item.slug));
      parts.push('');
      parts.push(t('common.share_signature'));
      setShare({ caption: parts.join('\n'), badge: publishDate || null });
    } catch {
      // user cancel — ignore
    }
  }

  return (
    <View className="flex-1 bg-card">
      {item ? (
        <ShareCardModal
          visible={!!share}
          onClose={() => setShare(null)}
          caption={share?.caption ?? ''}
          renderCard={(theme) => (
            <ArticleShareCard
              theme={theme}
              label={t('sharecard.label_news')}
              cta={t('sharecard.cta_read')}
              imageUrl={item.heroImageUrl}
              badge={share?.badge}
              title={item.judul}
              excerpt={item.ringkasan}
            />
          )}
          themes={['dark', 'orange']}
        />
      ) : null}
      <ScrollView onScroll={art.onScroll} scrollEventThrottle={16} className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {query.isPending ? (
          <View className="h-72 items-center justify-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-20 px-8" style={{ paddingTop: insets.top + 80 }}>
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable onPress={() => query.refetch()} {...gx('px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : item ? (
          <>
            {/* Hero 3:2 — sama dengan rasio unggahan di Portal & pratinjau link */}
            <HeroImage url={item.heroImageUrl} fallbackEmoji="📰" emojiSize={96} className="w-full" style={{ aspectRatio: 3 / 2 }} />

            {/* Lembar isi menumpang ke gambar */}
            <View className="bg-card -mt-5 rounded-t-[22px] px-5 pt-5 pb-3">
              <Text className="text-[22px] font-extrabold text-neutral-900 leading-7">{item.judul}</Text>

              {/* Tanggal · cabang · waktu baca */}
              <View className="flex-row items-center gap-2 mt-3">
                <View className="flex-1 min-w-0">
                  <Text className="text-xs font-semibold text-neutral-600" numberOfLines={1}>
                    {formatInstantDate(item.publishedAt, lang)}
                  </Text>
                  {item.cabang ? (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <MapPin size={11} color={nc('#737373')} />
                      <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
                        {item.cabang.nama}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <ReadTime minutes={readingMinutes(item.ringkasan, item.konten)} />
              </View>

              {/* Ringkasan = paragraf pembuka */}
              <LeadParagraph text={item.ringkasan} />

              {/* Konten markdown */}
              <View className="mt-4">
                <SimpleMarkdown source={item.konten} />
              </View>

              <FormCards sourceType="NEWS" sourceId={item.id} className="mt-5" />

              {/* Tags */}
              {item.tags && item.tags.length > 0 ? (
                <View className="flex-row flex-wrap gap-1.5 mt-5">
                  {item.tags.map((tag) => (
                    <View key={tag} className="px-2.5 py-1 bg-brand-50 border border-brand-100 rounded-full">
                      <Text className="text-[11px] font-bold text-brand-700">#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <EndActions bookmarked={bookmarked} onBookmark={handleToggleBookmark} onShare={handleShare} />

              {/* Berita lainnya — 3 terbaru dari daftar yang sudah dimuat */}
              {more.length ? (
                <View className="mt-6">
                  <Text className="text-[15px] font-extrabold text-neutral-900 mb-3">{t('content.more_news')}</Text>
                  <View className="gap-3">
                    {more.map((n) => (
                      <Pressable key={n.id} onPress={() => router.push(`/content/news/${n.slug || n.id}` as never)} className="flex-row gap-3 active:opacity-70">
                        <View style={{ width: 84, height: 56, borderRadius: 10, overflow: 'hidden' }}>
                          <HeroImage url={n.heroImageUrl} fallbackEmoji="📰" emojiSize={22} style={{ width: 84, height: 56 }} />
                        </View>
                        <View className="flex-1 min-w-0 justify-center">
                          <Text className="text-[13px] font-bold text-neutral-900 leading-[18px]" numberOfLines={2}>
                            {n.judul}
                          </Text>
                          <Text className="text-[11px] text-neutral-500 mt-0.5">{formatInstantDate(n.publishedAt, lang)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
      <ArticleTopBar
        bar={art.bar}
        progress={art.progress}
        title={item?.judul ?? ''}
        bookmarked={bookmarked}
        onBack={() => goBack(router)}
        onBookmark={handleToggleBookmark}
        onShare={handleShare}
      />
    </View>
  );
}
