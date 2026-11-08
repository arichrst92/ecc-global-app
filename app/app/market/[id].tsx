/**
 * Local Market public detail — per BE handoff doc 2026-05-22 (rev a).
 *
 * 2.4.7: header (hero, logo, nama, ikon sosmed & toko online, WhatsApp/Email) lalu
 * tab Katalog | Info supaya halaman tidak memanjang. Ikon hanya untuk data yang ada.
 */
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Map as MapIcon,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  Wifi,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { MarketDisclaimer } from '@/components/market/MarketDisclaimer';
import { useLocalMarketDetail } from '@/hooks/useLocalBusiness';
import { env } from '@/config/env';
import {
  MARKETPLACES,
  SOCIAL_PLATFORMS,
  businessShareUrl,
  hargaLabel,
  usernamesFromLinks,
  waNumber,
  type LocalItemJenis,
} from '@/types/localBusiness';
import { BrandIconLink } from '@/components/market/BrandIcon';
import { MARKET_ICONS, SOCIAL_ICONS } from '@/components/market/brandIcons';
import { goBack } from '@/utils/nav';
import { nc } from '@/theme/ThemeRoot';

export default function LocalMarketDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useLocalMarketDetail(id);
  const biz = query.data;
  const [filter, setFilter] = useState<'ALL' | LocalItemJenis>('ALL');
  const [tab, setTab] = useState<'katalog' | 'info' | null>(null);

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!biz) {
    return (
      <View className="flex-1 bg-neutral-50">
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => goBack(router)}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color={nc('#171717')} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('market.detail_not_found')}
          </Text>
        </View>
      </View>
    );
  }

  const tipeColor =
    biz.tipeBisnis === 'B2C'
      ? 'bg-emerald-100 text-emerald-700'
      : biz.tipeBisnis === 'B2B'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-violet-100 text-violet-700';
  const [tipeBg, tipeText] = tipeColor.split(' ');
  const items = biz.items ?? [];
  const hasBoth = items.some((i) => i.jenis === 'PRODUK') && items.some((i) => i.jenis === 'JASA');
  const shown = filter === 'ALL' ? items : items.filter((i) => i.jenis === filter);
  const waTarget = biz.waAdmin ? `https://wa.me/${waNumber(biz.waAdmin)}` : biz.whatsappUrl;
  // Tab awal: Katalog bila ada item, selain itu Info (tab Katalog disembunyikan).
  const activeTab = items.length === 0 ? 'info' : (tab ?? 'katalog');

  // Sosmed: username 2.4.7; usaha lama → ditebak dari URL. URL lain tetap tampil sebagai ikon link.
  const usernames = biz.socialUsernames ?? usernamesFromLinks(biz.socialLinks);
  const socialIcons = SOCIAL_PLATFORMS.filter((p) => usernames[p.key]).map((p) => ({
    key: p.key,
    label: p.label,
    url: p.url(usernames[p.key]!),
  }));
  const otherLinks = biz.socialUsernames
    ? []
    : (biz.socialLinks ?? []).filter((l) => !socialIcons.some((s) => s.url === l.url || l.url.includes(usernames[s.key] ?? '\u0000')));
  const shopIcons = MARKETPLACES.filter((m) => biz.marketplaceLinks?.[m.key]).map((m) => ({
    key: m.key,
    label: m.label,
    url: biz.marketplaceLinks![m.key]!,
  }));

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero */}
        <View className="relative">
          <HeroImage url={biz.heroImageUrl} fallbackEmoji="🏪" emojiSize={56} className="w-full aspect-video" />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View className="px-4 py-2 flex-row items-center justify-between">
              <Pressable onPress={() => goBack(router)} className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
                <ArrowLeft size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() =>
                  Share.share({
                    message: [biz.nama, [biz.industri, biz.owner.cabang?.nama].filter(Boolean).join(' · '), businessShareUrl(biz.id)]
                      .filter(Boolean)
                      .join('\n'),
                  }).catch(() => {})
                }
                accessibilityLabel={t('market.share')}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <Share2 size={18} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
          {biz.logoUrl ? (
            <View className="absolute -bottom-6 left-5 w-16 h-16 rounded-2xl bg-card border-4 border-white overflow-hidden">
              <Image
                source={{ uri: biz.logoUrl.startsWith('http') ? biz.logoUrl : `${env.apiBaseUrl}${biz.logoUrl}` }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        <View className="px-5 mt-8">
          {/* Nama + tipe + industri */}
          <View className="flex-row items-start gap-2 mb-1">
            <Text className="text-2xl font-bold text-neutral-900 flex-1">{biz.nama}</Text>
            <View className={`px-2 py-1 rounded-full ${tipeBg}`}>
              <Text className={`text-[10px] font-bold ${tipeText}`}>{biz.tipeBisnis}</Text>
            </View>
          </View>
          <View className="flex-row items-center flex-wrap gap-2 mb-3">
            {biz.industri ? <Text className="text-sm text-neutral-500">{biz.industri}</Text> : null}
            {biz.isOnline ? (
              <View className="bg-emerald-50 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                <Wifi size={11} color="#059669" />
                <Text className="text-[11px] font-semibold text-emerald-700">{t('market.online_business')}</Text>
              </View>
            ) : null}
          </View>

          {/* Ikon sosial media & toko online — hanya yang ada datanya */}
          {socialIcons.length > 0 || otherLinks.length > 0 ? (
            <View className="mb-3">
              <Text className="text-[11px] font-semibold text-neutral-400 mb-1.5">{t('market.social_section')}</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {socialIcons.map((s) => (
                  <BrandIconLink key={s.key} glyph={SOCIAL_ICONS[s.key]} url={s.url} label={s.label} />
                ))}
                {otherLinks.map((l, i) => (
                  <Pressable
                    key={`o${i}`}
                    onPress={() => openUrl(l.url)}
                    accessibilityLabel={l.platform}
                    className="w-[38px] h-[38px] rounded-full bg-neutral-200 items-center justify-center"
                  >
                    <Link2 size={16} color={nc('#404040')} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {shopIcons.length > 0 ? (
            <View className="mb-3">
              <Text className="text-[11px] font-semibold text-neutral-400 mb-1.5">{t('market.shop_section')}</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {shopIcons.map((m) => (
                  <BrandIconLink key={m.key} glyph={MARKET_ICONS[m.key]} url={m.url} label={m.label} shape="square" />
                ))}
              </View>
            </View>
          ) : null}

          {/* Kontak */}
          {waTarget || biz.email ? (
            <View className="flex-row gap-2 mb-4">
              {waTarget ? (
                <Pressable
                  onPress={() => openUrl(waTarget)}
                  className="flex-1 bg-emerald-600 rounded-2xl py-3 flex-row items-center justify-center gap-2"
                >
                  <MessageCircle size={16} color="#fff" />
                  <Text className="text-sm font-bold text-white">{t('katalog.wa_admin_btn')}</Text>
                </Pressable>
              ) : null}
              {biz.email ? (
                <Pressable
                  onPress={() => openUrl(`mailto:${biz.email}`)}
                  className="flex-1 bg-card border border-neutral-200 rounded-2xl py-3 flex-row items-center justify-center gap-2"
                >
                  <Mail size={16} color={nc('#404040')} />
                  <Text className="text-sm font-bold text-neutral-800">{t('katalog.email_btn')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Buka lokasi di Google Maps — hanya bila link Maps diisi */}
          {biz.mapsUrl ? (
            <Pressable
              onPress={() => openUrl(biz.mapsUrl!)}
              accessibilityRole="link"
              className="mb-4 -mt-2 bg-card border border-neutral-200 rounded-2xl py-3 flex-row items-center justify-center gap-2"
            >
              <MapIcon size={16} color="#EA580C" />
              <Text className="text-sm font-bold text-neutral-800">{t('market.open_location')}</Text>
            </Pressable>
          ) : null}

          {/* Tab Katalog | Info */}
          {items.length > 0 ? (
            <View className="flex-row border-b border-neutral-200 mb-3">
              {(['katalog', 'info'] as const).map((k) => (
                <Pressable key={k} onPress={() => setTab(k)} className="flex-1 items-center pb-2.5 pt-1">
                  <Text className={`text-sm font-bold ${activeTab === k ? 'text-brand-600' : 'text-neutral-500'}`}>
                    {k === 'katalog' ? `${t('katalog.section')} (${items.length})` : t('market.tab_info')}
                  </Text>
                  <View className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full ${activeTab === k ? 'bg-brand-500' : ''}`} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {activeTab === 'katalog' ? (
            <View>
              {hasBoth ? (
                <View className="flex-row gap-1.5 mb-2">
                  {(['ALL', 'PRODUK', 'JASA'] as const).map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full ${filter === f ? 'bg-brand-500' : 'bg-neutral-100'}`}
                    >
                      <Text className={`text-xs font-semibold ${filter === f ? 'text-white' : 'text-neutral-600'}`}>
                        {f === 'ALL' ? t('market.filter_all') : f === 'JASA' ? t('katalog.jenis_jasa') : t('katalog.jenis_produk')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -5 }}>
                {shown.map((it) => (
                  <View key={it.id} style={{ width: '50%', padding: 5 }}>
                    <Pressable
                      onPress={() => router.push(`/market/item/${it.id}?bizId=${biz.id}` as never)}
                      className="bg-card rounded-2xl border border-neutral-100 overflow-hidden"
                    >
                      <HeroImage
                        url={it.fotoUrls[0]}
                        fallbackEmoji={it.jenis === 'JASA' ? '🛠️' : '📦'}
                        emojiSize={28}
                        style={{ width: '100%', aspectRatio: 1.5 }}
                      />
                      <View className="p-2.5">
                        <Text className="text-[13px] font-semibold text-neutral-900" numberOfLines={2}>
                          {it.nama}
                        </Text>
                        <Text
                          className={`text-xs font-bold mt-1 ${it.hargaTipe === 'NEGO' ? 'text-neutral-500' : 'text-brand-600'}`}
                          numberOfLines={1}
                        >
                          {hargaLabel(it, t('katalog.harga_nego'), t('katalog.harga_mulai'))}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {biz.deskripsi ? (
                <View className="bg-card rounded-2xl p-4 border border-neutral-100">
                  <Text className="text-sm text-neutral-700 leading-relaxed">{biz.deskripsi}</Text>
                </View>
              ) : null}

              {biz.lokasi || biz.mapsUrl ? (
                <Pressable
                  disabled={!biz.mapsUrl}
                  onPress={() => biz.mapsUrl && openUrl(biz.mapsUrl)}
                  className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-start gap-3"
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                    <MapPin size={18} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-500">{t('market.location_label')}</Text>
                    <Text className="text-sm text-neutral-900 leading-relaxed">{biz.lokasi || t('market.open_maps')}</Text>
                    {biz.mapsUrl ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <MapIcon size={12} color="#EA580C" />
                        <Text className="text-xs font-semibold text-brand-600">{t('market.open_maps')}</Text>
                      </View>
                    ) : null}
                  </View>
                  {biz.mapsUrl ? <ExternalLink size={14} color={nc('#A3A3A3')} /> : null}
                </Pressable>
              ) : null}

              {biz.websiteUrl ? (
                <Pressable
                  onPress={() => openUrl(biz.websiteUrl!)}
                  className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                    <Globe size={18} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">{t('market.website_btn')}</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                      {biz.websiteUrl}
                    </Text>
                  </View>
                  <ExternalLink size={14} color={nc('#A3A3A3')} />
                </Pressable>
              ) : null}

              {biz.companyProfileUrl ? (
                <Pressable
                  onPress={() =>
                    openUrl(
                      biz.companyProfileUrl!.startsWith('http') ? biz.companyProfileUrl! : `${env.apiBaseUrl}${biz.companyProfileUrl}`,
                    )
                  }
                  className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                    <FileText size={18} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">{t('market.profile_pdf_btn')}</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">{t('market.profile_pdf_sub')}</Text>
                  </View>
                  <ExternalLink size={14} color={nc('#A3A3A3')} />
                </Pressable>
              ) : null}

              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-1">{t('market.owner_section')}</Text>
              <Pressable
                onPress={() => router.push(`/jemaat/${biz.owner.id}` as never)}
                className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
              >
                <Avatar name={biz.owner.namaLengkap} fotoUrl={biz.owner.fotoUrl ?? undefined} size={44} />
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                    {biz.owner.namaLengkap}
                  </Text>
                  {biz.owner.cabang ? <Text className="text-xs text-neutral-500 mt-0.5">{biz.owner.cabang.nama}</Text> : null}
                </View>
                <ChevronRight size={14} color={nc('#A3A3A3')} />
              </Pressable>
            </View>
          )}

          <MarketDisclaimer className="mt-4" />
        </View>
      </ScrollView>
    </View>
  );
}
