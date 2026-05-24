import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Tag } from 'lucide-react-native';

import { GuestModeBanner } from '@/components/GuestModeBanner';
import { Picker } from '@/components/ui/Picker';
import { SafeImage } from '@/components/ui/SafeImage';
import { useBranches } from '@/hooks/useBranches';
import { usePublicEvents } from '@/hooks/usePublicGuest';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/utils/date';
import type { PublicEventItem } from '@/types/publicGuest';

function priceLabel(e: PublicEventItem, t: (k: string) => string, lang: string): string {
  if (e.tipeBayar === 'GRATIS') return t('event.free');
  if (e.tipeBayar === 'NOMINAL_BEBAS') return lang === 'id' ? 'Persembahan' : 'Donation';
  const num = Number(e.nominal ?? 0);
  if (num >= 1000) return `Rp ${(num / 1000).toLocaleString('id-ID')}rb`;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

/**
 * Event list untuk guest — read-only, no RSVP button.
 * Endpoint /public/event filter is_active + is_public + is_published + future.
 */
export function GuestEventView() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);
  const lang = i18n.language;
  const [cabangId, setCabangId] = useState<string>('');

  const branchesQuery = useBranches();
  const eventsQuery = usePublicEvents(cabangId || null);

  const branchOptions = (branchesQuery.data ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    sub: b.alamat,
  }));

  const effectiveCabangId =
    cabangId || (branchesQuery.data && branchesQuery.data[0]?.id) || '';

  const items = eventsQuery.data?.data ?? [];

  async function promptSignup() {
    await exitGuestMode();
    router.replace('/(auth)/welcome');
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      <View className="bg-brand-500 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-lg font-bold">{t('nav.event')}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isFetching}
            onRefresh={() => eventsQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
      >
        <GuestModeBanner compact />

        <View className="bg-white rounded-2xl p-3 border border-neutral-100 mb-3">
          <Picker
            label={t('signup.branch')}
            placeholder={
              branchesQuery.isPending ? t('common.loading') : t('signup.branch_placeholder')
            }
            value={effectiveCabangId}
            options={branchOptions}
            onChange={setCabangId}
            modalTitle={t('signup.branch_modal_title')}
          />
        </View>

        {eventsQuery.isPending ? (
          <ActivityIndicator className="mt-8" color="#EA580C" />
        ) : null}

        {items.length === 0 && !eventsQuery.isPending ? (
          <View className="items-center py-12">
            <CalendarDays size={36} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 mt-3">{t('event.empty_msg')}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          {items.map((ev) => (
            <Pressable
              key={ev.id}
              onPress={promptSignup}
              className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
            >
              <SafeImage
                uri={ev.heroImageUrl}
                style={{ width: '100%', aspectRatio: 16 / 9 }}
                resizeMode="cover"
              />
              <View className="p-4">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={2}>
                  {ev.judul}
                </Text>
                {ev.ringkasan ? (
                  <Text className="text-xs text-neutral-600 mt-1 leading-relaxed" numberOfLines={2}>
                    {ev.ringkasan}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <View className="flex-row items-center gap-1">
                    <CalendarDays size={12} color="#737373" />
                    <Text className="text-xs text-neutral-700">
                      {formatDate(ev.tanggalMulai, lang)}
                    </Text>
                  </View>
                  {ev.lokasi ? (
                    <View className="flex-row items-center gap-1">
                      <MapPin size={12} color="#737373" />
                      <Text className="text-xs text-neutral-700">{ev.lokasi}</Text>
                    </View>
                  ) : null}
                  <View className="flex-row items-center gap-1">
                    <Tag size={12} color="#737373" />
                    <Text className="text-xs text-neutral-700">{priceLabel(ev, t, lang)}</Text>
                  </View>
                </View>
                {ev.cabang ? (
                  <Text className="text-[11px] text-neutral-500 mt-2">{ev.cabang.nama}</Text>
                ) : (
                  <Text className="text-[11px] text-neutral-500 mt-2 italic">
                    {t('event.synod_level')}
                  </Text>
                )}
                <Pressable
                  onPress={promptSignup}
                  className="mt-3 bg-neutral-100 rounded-xl py-2 items-center"
                >
                  <Text className="text-xs text-neutral-600 font-medium">
                    {t('guest.cta_signup_to_rsvp')}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
