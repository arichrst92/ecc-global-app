import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { formatInstantDate } from '@/utils/time';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';
import { useRenunganDetail, useRenunganList } from '@/hooks/useContent';
import { useBookmarksStore } from '@/stores/bookmarks.store';
import { formatDate, parseLocalDate } from '@/utils/date';
import { buildRenunganShareUrl } from '@/utils/share';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { ShareCardModal } from '@/features/share/ShareCardModal';
import { ArticleShareCard } from '@/features/share/cards';
import { ArticleTopBar, EndActions, LeadParagraph, ReadTime, VerseCard, readingMinutes, useArticleScroll } from '@/components/content/ArticleBits';
import { gradientStyle } from '@/components/detail/DetailBits';

export default function RenunganDetailScreen() {
  const { width } = useWindowDimensions();
  const art = useArticleScroll(width / 1.5);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detailQuery = useRenunganDetail(id);
  const item = detailQuery.data;

  const toggleBookmark = useBookmarksStore((s) => s.toggle);
  const bookmarked = useBookmarksStore((s) =>
    item ? s.isBookmarked('RENUNGAN', item.id) : false,
  );

  function handleToggleBookmark() {
    if (!item) return;
    toggleBookmark({
      id: item.id,
      tipe: 'RENUNGAN',
      judul: item.judul,
      slug: item.slug,
      ringkasan: item.ringkasan,
      heroImageUrl: item.heroImageUrl,
      publishedAt: item.publishedAt,
    });
  }
  // Prev/next computed dari list (sorted desc by tanggal di BE).
  // Pakai list untuk navigasi lokal tanpa extra round-trip per click.
  const listQuery = useRenunganList(30);

  const { prev, next } = useMemo(() => {
    const list = listQuery.data ?? [];
    if (!item || list.length === 0) return { prev: null, next: null };
    const idx = list.findIndex((r) => r.id === item.id || r.slug === item.slug);
    if (idx === -1) return { prev: null, next: null };
    // List sorted desc by tanggal — idx-1 = renungan lebih baru (next chronologically),
    // idx+1 = renungan lebih lama (prev chronologically).
    // UI convention: "Sebelumnya" = renungan yang lebih lama, "Berikutnya" = lebih baru.
    return { next: idx > 0 ? list[idx - 1]! : null, prev: idx < list.length - 1 ? list[idx + 1]! : null };
  }, [item, listQuery.data]);
  const slugOf = (r: { slug: string; id: string }) => r.slug || r.id;

  // Tanggal besar di atas gambar: "26" + "Kamis" / "Nov 2026".
  const dateParts = useMemo(() => {
    // `tanggal` = tanggal renungan (TZ-safe seperti formatDate); cadangan publishedAt.
    const d = item?.tanggal ? parseLocalDate(item.tanggal) : item?.publishedAt ? new Date(item.publishedAt) : null;
    if (!d) return null;
    if (Number.isNaN(d.getTime())) return null;
    const loc = lang === 'en' ? 'en-GB' : 'id-ID';
    return {
      day: String(d.getDate()),
      weekday: d.toLocaleDateString(loc, { weekday: 'long' }),
      monthYear: d.toLocaleDateString(loc, { month: 'short', year: 'numeric' }),
    };
  }, [item?.tanggal, item?.publishedAt, lang]);
  const shade = gradientStyle('linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)');

  const [share, setShare] = useState<{ caption: string; badge: string | null } | null>(null);

  async function handleShare() {
    if (!item) return;
    try {
      // Format tanggal renungan (khusus renungan pakai field `tanggal`) +
      // Universal Link untuk buka detail di app kalau recipient sudah install
      const dateStr = item.tanggal
        ? formatDate(item.tanggal, lang)
        : item.publishedAt
          ? formatInstantDate(item.publishedAt, lang)
          : '';
      const parts: string[] = [];
      if (dateStr) parts.push(`📅 ${dateStr}`);
      if (item.ayatAlkitab) parts.push(`📖 ${item.ayatAlkitab}`);
      parts.push('');
      parts.push(`*${item.judul}*`);
      parts.push('');
      parts.push(item.ringkasan);
      parts.push('');
      parts.push(buildRenunganShareUrl(item.slug));
      parts.push('');
      parts.push(t('common.share_signature'));
      setShare({ caption: parts.join('\n'), badge: dateStr || null });
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
              label={t('sharecard.label_renungan')}
              cta={t('sharecard.cta_read')}
              imageUrl={item.heroImageUrl}
              badge={share?.badge}
              title={item.judul}
              excerpt={item.ayatAlkitab || item.ringkasan}
            />
          )}
        />
      ) : null}
      <ScrollView onScroll={art.onScroll} scrollEventThrottle={16} className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {detailQuery.isPending ? (
          <View className="h-72 items-center justify-center">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : detailQuery.isError ? (
          <View className="items-center py-20 px-8" style={{ paddingTop: 120 }}>
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable onPress={() => detailQuery.refetch()} {...gx('px-4 py-2 bg-brand-500 rounded-lg')}>
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : item ? (
          <>
            {/* Hero 3:2 — sama dengan rasio unggahan di Portal & pratinjau link; tanggal besar di atas gambar */}
            <View>
              <HeroImage url={item.heroImageUrl} fallbackEmoji="📖" emojiSize={96} className="w-full" style={{ aspectRatio: 3 / 2 }} />
              {dateParts ? (
                <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }, shade]}>
                  <View style={{ position: 'absolute', left: 20, bottom: 30, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                    <Text style={{ color: '#fff', fontSize: 42, fontWeight: '800', lineHeight: 42, letterSpacing: -1 }}>{dateParts.day}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 15, marginBottom: 3 }}>
                      {dateParts.weekday}
                      {'\n'}
                      {dateParts.monthYear}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View className="bg-card -mt-5 rounded-t-[22px] px-5 pt-5 pb-3">
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-[10px] font-extrabold text-brand-600 tracking-widest uppercase">{t('content.renungan_daily')}</Text>
                <ReadTime minutes={readingMinutes(item.ringkasan, item.konten)} />
              </View>
              <Text className="text-[22px] font-extrabold text-neutral-900 leading-7 mt-1.5">{item.judul}</Text>

              {/* Ayat hari ini — teks dari Alkitab offline (versi sesuai tulisan ayat) */}
              <VerseCard ayat={item.ayatAlkitab} />

              {/* Ringkasan = paragraf pembuka */}
              <LeadParagraph text={item.ringkasan} />

              {/* Konten markdown */}
              <View className="mt-4">
                <SimpleMarkdown source={item.konten} />
              </View>

              <EndActions bookmarked={bookmarked} onBookmark={handleToggleBookmark} onShare={handleShare} />
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

      {/* Bottom prev/next nav */}
      {item ? (
        <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-neutral-100">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row px-3 py-2 gap-2">
              <NavButton
                label={t('content.prev')}
                direction="prev"
                item={prev}
                lang={lang}
                onPress={() => prev && router.replace(`/content/renungan/${slugOf(prev)}`)}
              />
              <NavButton
                label={t('content.next')}
                direction="next"
                item={next}
                lang={lang}
                onPress={() => next && router.replace(`/content/renungan/${slugOf(next)}`)}
              />
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}

/** Sebelumnya / Berikutnya: label + tanggal, lalu judul renungan tujuan. */
function NavButton({
  label,
  direction,
  item,
  lang,
  onPress,
}: {
  label: string;
  direction: 'prev' | 'next';
  item: { judul: string; tanggal?: string; publishedAt?: string } | null;
  lang: string;
  onPress: () => void;
}) {
  const disabled = !item;
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight;
  const d = item?.tanggal ? parseLocalDate(item.tanggal) : item?.publishedAt ? new Date(item.publishedAt) : null;
  const date = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short' }) : '';
  const right = direction === 'next';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`flex-1 rounded-2xl px-3 py-2 ${disabled ? 'bg-neutral-100' : 'bg-card border border-neutral-200 active:opacity-70'}`}
    >
      <View className={`flex-row items-center gap-1 ${right ? 'justify-end' : ''}`}>
        {!right ? <Icon size={12} color={disabled ? nc('#A3A3A3') : '#EA580C'} /> : null}
        <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${disabled ? 'text-neutral-400' : 'text-brand-600'}`} numberOfLines={1}>
          {label}
          {date ? ` · ${date}` : ''}
        </Text>
        {right ? <Icon size={12} color={disabled ? nc('#A3A3A3') : '#EA580C'} /> : null}
      </View>
      {item ? (
        <Text className={`text-xs font-bold text-neutral-900 mt-0.5 ${right ? 'text-right' : ''}`} numberOfLines={1}>
          {item.judul}
        </Text>
      ) : null}
    </Pressable>
  );
}
