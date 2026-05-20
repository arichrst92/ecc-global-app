import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Bookmark, Calendar, MapPin, Share2, Users } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useEventDetail } from '@/hooks/useEvents';
import { formatDate } from '@/utils/date';

export default function EventDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useEventDetail(id);
  const event = query.data;

  const isFree = event?.tipeBayar === 'GRATIS';
  const isFull = event?.quotaPeserta != null && event.pesertaCount >= event.quotaPeserta;
  const priceLabel = (() => {
    if (!event) return '';
    if (event.tipeBayar === 'GRATIS') return t('event.free');
    if (event.tipeBayar === 'NOMINAL_BEBAS')
      return lang === 'id' ? 'Persembahan' : 'Donation';
    const num = Number(event.nominal);
    return `Rp ${num.toLocaleString('id-ID')}`;
  })();

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        stickyHeaderIndices={[]}
      >
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
              <View className="flex-row gap-2">
                <Pressable className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
                  <Bookmark size={18} color="#fff" />
                </Pressable>
                <Pressable className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
                  <Share2 size={18} color="#fff" />
                </Pressable>
              </View>
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
            <Pressable onPress={() => query.refetch()} className="px-4 py-2 bg-brand-500 rounded-lg">
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : event ? (
          <>
            {/* Hero block */}
            <View className="h-72 bg-brand-500 items-center justify-center">
              <Text style={{ fontSize: 96 }}>🎉</Text>
            </View>

            <View className="bg-neutral-50 -mt-5 rounded-t-3xl pt-5 px-5 pb-5">
              <View
                className={`px-2.5 py-1 rounded-full self-start ${isFree ? 'bg-emerald-50' : 'bg-amber-50'} mb-2`}
              >
                <Text
                  className={`text-xs font-semibold ${isFree ? 'text-emerald-700' : 'text-amber-700'}`}
                >
                  {priceLabel}
                </Text>
              </View>
              <Text className="text-2xl font-bold text-neutral-900 leading-tight">{event.judul}</Text>

              {/* Meta */}
              <View className="mt-4 gap-2.5">
                <MetaRow
                  icon={<Calendar size={20} color="#EA580C" />}
                  primary={`${formatDate(event.tanggalMulai, lang)}${
                    event.tanggalSelesai !== event.tanggalMulai
                      ? ` - ${formatDate(event.tanggalSelesai, lang)}`
                      : ''
                  }`}
                  secondary={
                    event.tanggalSelesai !== event.tanggalMulai
                      ? lang === 'id'
                        ? 'Multi-day'
                        : 'Multi-day'
                      : null
                  }
                />
                <MetaRow
                  icon={<MapPin size={20} color="#EA580C" />}
                  primary={event.lokasi}
                />
                {event.quotaPeserta != null ? (
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                      <Users size={20} color="#EA580C" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-neutral-900">
                        {event.pesertaCount}/{event.quotaPeserta} {t('event.participants_label')}
                      </Text>
                      <View className="mt-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-brand-500'}`}
                          style={{ width: `${Math.min(100, (event.pesertaCount / event.quotaPeserta) * 100)}%` }}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <MetaRow
                    icon={<Users size={20} color="#EA580C" />}
                    primary={t('event.participants_count', { count: event.pesertaCount })}
                  />
                )}
              </View>

              {/* Deskripsi */}
              <View className="mt-5">
                <Text className="text-lg font-bold text-neutral-900 mb-2">
                  {t('event.about_event')}
                </Text>
                {/* Plain text fallback — markdown render M4 atau add lib */}
                <Text className="text-sm text-neutral-700 leading-relaxed">
                  {event.deskripsi}
                </Text>
              </View>

              {/* Tags */}
              {event.tags && event.tags.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {event.tags.map((tag) => (
                    <View
                      key={tag}
                      className="px-2.5 py-1 bg-neutral-100 rounded-full"
                    >
                      <Text className="text-xs text-neutral-600">#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA */}
      {event ? (
        <View className="bg-white border-t border-neutral-100 px-5 py-3">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-center gap-3">
              <View>
                <Text className="text-xs text-neutral-500">{t('event.fee_label')}</Text>
                <Text className="text-lg font-bold text-neutral-900">{priceLabel}</Text>
              </View>
              <View className="flex-1">
                <Button
                  label={isFull ? t('event.quota_full') : t('event.register_now')}
                  onPress={() => router.push(`/event/${id}/register`)}
                  disabled={isFull}
                  fullWidth
                  size="lg"
                  rightIcon={<ArrowRight size={16} color="#fff" />}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}

function MetaRow({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string | null;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Text className="font-semibold text-neutral-900">{primary}</Text>
        {secondary ? <Text className="text-xs text-neutral-500 mt-0.5">{secondary}</Text> : null}
      </View>
    </View>
  );
}
