/**
 * Local Market public detail — per BE handoff doc 2026-05-22 (rev a).
 *
 * Hero + logo overlay + nama + tipe badge + industri + deskripsi + lokasi
 * + links (website, WhatsApp, social media), download PDF profile, owner card.
 */
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  MessageCircle,
  Wifi,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HeroImage } from '@/components/ui/HeroImage';
import { useLocalMarketDetail } from '@/hooks/useLocalBusiness';
import { env } from '@/config/env';

export default function LocalMarketDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useLocalMarketDetail(id);
  const biz = query.data;

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
        <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <ArrowLeft size={20} color="#171717" />
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

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <View className="relative">
          <HeroImage
            url={biz.heroImageUrl}
            fallbackEmoji="🏪"
            emojiSize={56}
            className="w-full aspect-video"
          />
          {/* Back btn overlay */}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View className="px-4 py-2 flex-row items-center">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              >
                <ArrowLeft size={20} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
          {/* Logo overlay bottom-left */}
          {biz.logoUrl ? (
            <View className="absolute -bottom-6 left-5 w-16 h-16 rounded-2xl bg-white border-4 border-white overflow-hidden">
              <Image
                source={{
                  uri: biz.logoUrl.startsWith('http')
                    ? biz.logoUrl
                    : `${env.apiBaseUrl}${biz.logoUrl}`,
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        <View className="px-5 mt-8">
          {/* Nama + tipe + industri */}
          <View className="flex-row items-start gap-2 mb-2">
            <Text className="text-2xl font-bold text-neutral-900 flex-1">
              {biz.nama}
            </Text>
            <View className={`px-2 py-1 rounded-full ${tipeBg}`}>
              <Text className={`text-[10px] font-bold ${tipeText}`}>
                {biz.tipeBisnis}
              </Text>
            </View>
          </View>
          {biz.industri ? (
            <Text className="text-sm text-neutral-500 mb-3">{biz.industri}</Text>
          ) : null}

          {/* Online badge */}
          {biz.isOnline ? (
            <View className="bg-emerald-50 rounded-xl p-3 flex-row items-center gap-2 mb-3 self-start">
              <Wifi size={14} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-700">
                {t('market.online_business')}
              </Text>
            </View>
          ) : null}

          {/* Deskripsi */}
          {biz.deskripsi ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3">
              <Text className="text-sm text-neutral-700 leading-relaxed">
                {biz.deskripsi}
              </Text>
            </View>
          ) : null}

          {/* Lokasi */}
          {biz.lokasi ? (
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                <MapPin size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-neutral-500">
                  {t('market.location_label')}
                </Text>
                <Text className="text-sm text-neutral-900 leading-relaxed">
                  {biz.lokasi}
                </Text>
              </View>
            </View>
          ) : null}

          {/* WhatsApp */}
          {biz.whatsappUrl ? (
            <Pressable
              onPress={() => openUrl(biz.whatsappUrl!)}
              className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
                <MessageCircle size={18} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('market.whatsapp_btn')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                  {biz.whatsappUrl}
                </Text>
              </View>
              <ChevronRight size={16} color="#A3A3A3" />
            </Pressable>
          ) : null}

          {/* Website */}
          {biz.websiteUrl ? (
            <Pressable
              onPress={() => openUrl(biz.websiteUrl!)}
              className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <Globe size={18} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('market.website_btn')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                  {biz.websiteUrl}
                </Text>
              </View>
              <ExternalLink size={14} color="#A3A3A3" />
            </Pressable>
          ) : null}

          {/* Company profile PDF */}
          {biz.companyProfileUrl ? (
            <Pressable
              onPress={() =>
                openUrl(
                  biz.companyProfileUrl!.startsWith('http')
                    ? biz.companyProfileUrl!
                    : `${env.apiBaseUrl}${biz.companyProfileUrl}`,
                )
              }
              className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                <FileText size={18} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {t('market.profile_pdf_btn')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('market.profile_pdf_sub')}
                </Text>
              </View>
              <ExternalLink size={14} color="#A3A3A3" />
            </Pressable>
          ) : null}

          {/* Social links */}
          {biz.socialLinks.length > 0 ? (
            <>
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2 mb-2">
                {t('market.social_section')}
              </Text>
              <View className="bg-white rounded-2xl border border-neutral-100 mb-3">
                {biz.socialLinks.map((s, idx) => (
                  <Pressable
                    key={`${s.platform}-${idx}`}
                    onPress={() => openUrl(s.url)}
                    className={`p-3 flex-row items-center gap-3 ${
                      idx > 0 ? 'border-t border-neutral-100' : ''
                    }`}
                  >
                    <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
                      <ExternalLink size={14} color="#525252" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-neutral-900">
                        {s.platform}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                        {s.url}
                      </Text>
                    </View>
                    <ChevronRight size={14} color="#A3A3A3" />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {/* Owner card */}
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2 mb-2">
            {t('market.owner_section')}
          </Text>
          <Pressable
            onPress={() => router.push(`/jemaat/${biz.owner.id}` as never)}
            className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
          >
            <Avatar
              name={biz.owner.namaLengkap}
              fotoUrl={biz.owner.fotoUrl ?? undefined}
              size={44}
            />
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                {biz.owner.namaLengkap}
              </Text>
              {biz.owner.cabang ? (
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {biz.owner.cabang.nama}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={14} color="#A3A3A3" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
