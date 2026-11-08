/**
 * Detail item katalog Local Market — 2.4.7.
 * Param: itemId (path), bizId (query). Data diambil dari detail bisnis
 * (sudah berisi item aktif) supaya tidak perlu endpoint baru di app.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Mail, MessageCircle, Share2 } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { MarketDisclaimer } from '@/components/market/MarketDisclaimer';
import { useLocalMarketDetail } from '@/hooks/useLocalBusiness';
import { pingItemView } from '@/api/businesses';
import { MARKETPLACES, hargaLabel, itemShareUrl, waNumber } from '@/types/localBusiness';
import { BrandIconLink } from '@/components/market/BrandIcon';
import { MARKET_ICONS } from '@/components/market/brandIcons';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function MarketItemScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const router = useRouter();
  const { itemId, bizId } = useLocalSearchParams<{ itemId: string; bizId: string }>();
  const query = useLocalMarketDetail(bizId);
  const biz = query.data;
  const item = biz?.items?.find((i) => i.id === itemId);
  const [page, setPage] = useState(0);
  const found = !!item;
  // Hitung kunjungan item (server abaikan pemilik & dedupe 30 menit).
  useEffect(() => {
    if (found && bizId && itemId) pingItemView(bizId, itemId).catch(() => {});
  }, [found, bizId, itemId]);

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!biz || !item) {
    return (
      <View className="flex-1 bg-neutral-50">
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color={nc('#171717')} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">{t('katalog.not_found')}</Text>
        </View>
      </View>
    );
  }

  const harga = hargaLabel(item, t('katalog.harga_nego'), t('katalog.harga_mulai'));
  const link = itemShareUrl(biz.id, item.id);
  const pesan = t('katalog.wa_message', { usaha: biz.nama, item: item.nama, harga, link });
  const wa = biz.waAdmin
    ? `https://wa.me/${waNumber(biz.waAdmin)}?text=${encodeURIComponent(pesan)}`
    : biz.whatsappUrl
      ? `${biz.whatsappUrl}${biz.whatsappUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(pesan)}`
      : null;
  const mail = biz.email
    ? `mailto:${biz.email}?subject=${encodeURIComponent(t('katalog.email_subject', { item: item.nama }))}&body=${encodeURIComponent(pesan)}`
    : null;
  const shopIcons = MARKETPLACES.filter((m) => item.marketplaceLinks?.[m.key]).map((m) => ({
    key: m.key,
    label: m.label,
    url: item.marketplaceLinks![m.key]!,
  }));
  const fotos = item.fotoUrls.length ? item.fotoUrls : [null];
  const open = (u: string) => Linking.openURL(u).catch(() => {});

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {fotos.map((f, i) => (
              <HeroImage
                key={`${f}-${i}`}
                url={f}
                fallbackEmoji={item.jenis === 'JASA' ? '🛠️' : '📦'}
                emojiSize={48}
                style={{ width, aspectRatio: 1.5 }}
              />
            ))}
          </ScrollView>
          {fotos.length > 1 ? (
            <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1.5">
              {fotos.map((_, i) => (
                <View key={i} className={`h-1.5 rounded-full ${i === page ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
              ))}
            </View>
          ) : null}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View className="px-4 py-2 flex-row items-center justify-between">
              <Pressable
                onPress={() => goBack(router)}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <ArrowLeft size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => Share.share({ message: `${item.nama} — ${biz.nama}\n${harga}\n${link}` }).catch(() => {})}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <Share2 size={18} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View className="px-5 pt-4">
          <View className="self-start bg-brand-50 rounded-full px-2.5 py-0.5 mb-2">
            <Text className="text-[10px] font-bold uppercase text-brand-700">
              {item.jenis === 'JASA' ? t('katalog.jenis_jasa') : t('katalog.jenis_produk')}
            </Text>
          </View>
          <Text className="text-xl font-bold text-neutral-900">{item.nama}</Text>
          <Text
            className={`text-lg font-bold mt-1 ${item.hargaTipe === 'NEGO' ? 'text-neutral-500' : 'text-brand-600'}`}
          >
            {harga}
          </Text>
          {/* Beli juga di — hanya link produk yang diisi (tanpa cadangan link toko) */}
          {shopIcons.length > 0 ? (
            <View className="mt-3">
              <Text className="text-[11px] font-semibold text-neutral-400 mb-1.5">{t('katalog.buy_also')}</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {shopIcons.map((m) => (
                  <BrandIconLink key={m.key} glyph={MARKET_ICONS[m.key]} url={m.url} label={m.label} shape="square" />
                ))}
              </View>
            </View>
          ) : null}
          {item.deskripsi ? (
            <Text className="text-sm text-neutral-700 leading-relaxed mt-3">{item.deskripsi}</Text>
          ) : null}

          <Pressable
            onPress={() => router.push(`/market/${biz.id}` as never)}
            className="mt-5 bg-card rounded-2xl p-3 border border-neutral-100 flex-row items-center gap-3"
          >
            <HeroImage
              url={biz.logoUrl}
              fallbackEmoji="🏪"
              emojiSize={20}
              style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden' }}
            />
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                {biz.nama}
              </Text>
              <Text className="text-xs text-neutral-500" numberOfLines={1}>
                {[biz.industri, biz.owner?.cabang?.nama].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <ChevronRight size={14} color={nc('#A3A3A3')} />
          </Pressable>

          <MarketDisclaimer className="mt-4" />
        </View>
      </ScrollView>

      {wa || mail ? (
        <View className="bg-card border-t border-neutral-100 px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row gap-2">
            {wa ? (
              <Pressable
                onPress={() => open(wa)}
                className="flex-1 bg-emerald-600 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
              >
                <MessageCircle size={16} color="#fff" />
                <Text className="text-sm font-bold text-white">{t('katalog.ask_wa')}</Text>
              </Pressable>
            ) : null}
            {mail ? (
              <Pressable
                onPress={() => open(mail)}
                className={`${wa ? 'px-4' : 'flex-1'} bg-card border border-neutral-200 rounded-2xl py-3.5 flex-row items-center justify-center gap-2`}
              >
                <Mail size={16} color={nc('#404040')} />
                {!wa ? <Text className="text-sm font-bold text-neutral-800">{t('katalog.email_btn')}</Text> : null}
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
