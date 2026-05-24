import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Calendar, Church, ChevronsUpDown, MapPin, Video } from 'lucide-react-native';

import { GuestModeBanner } from '@/components/GuestModeBanner';
import { Picker } from '@/components/ui/Picker';
import { useBranches } from '@/hooks/useBranches';
import { usePublicIbadah } from '@/hooks/usePublicGuest';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateWithDay, groupByDate, isToday } from '@/utils/date';
import { getOnlineLink } from '@/utils/ibadahOnline';

/**
 * Ibadah list untuk guest — read-only, no check-in button.
 *
 * Beda dari IbadahListAuthenticated:
 * - Endpoint `/public/ibadah/calendar` (no auth, filter is_public=true)
 * - No petugas display, no attendees count
 * - No check-in button — replace dengan CTA "Daftar untuk Check-in" di card
 *   (tap → exit guest + welcome)
 * - Cabang picker dari useBranches() (skipAuth), default first cabang
 */
export function GuestIbadahView() {
  const { t } = useTranslation();
  const router = useRouter();
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);
  const [cabangId, setCabangId] = useState<string>('');

  const branchesQuery = useBranches();
  const ibadahQuery = usePublicIbadah(cabangId || null);

  const branchOptions = (branchesQuery.data ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    sub: b.alamat,
  }));

  // Default ke cabang pertama kalau user belum pilih
  const effectiveCabangId =
    cabangId || (branchesQuery.data && branchesQuery.data[0]?.id) || '';

  const items = ibadahQuery.data?.data ?? [];
  const groupedMap = groupByDate(items);
  const grouped = Object.entries(groupedMap).sort(([a], [b]) => (a < b ? -1 : 1));

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
            <Text className="text-white text-lg font-bold mb-3">{t('nav.ibadah')}</Text>
            <Pressable
              onPress={() => {
                // Cabang picker via Picker modal — pakai segmented-like state
                // Simpler: cycle through branches kalau cuma trigger picker
                // Implementation: just open picker by tapping below
              }}
            />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={ibadahQuery.isFetching}
            onRefresh={() => ibadahQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
      >
        <GuestModeBanner compact />

        {/* Cabang picker */}
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

        {ibadahQuery.isPending ? (
          <ActivityIndicator className="mt-8" color="#EA580C" />
        ) : null}

        {ibadahQuery.isError ? (
          <Text className="text-sm text-red-600 text-center py-8">
            {t('error.generic')}
          </Text>
        ) : null}

        {items.length === 0 && !ibadahQuery.isPending ? (
          <View className="items-center py-12">
            <Calendar size={36} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 mt-3">{t('ibadah.empty_msg')}</Text>
          </View>
        ) : null}

        {/* Grouped by date */}
        {grouped.map(([date, dayItems]) => (
          <View key={date} className="mb-4">
            <Text
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${
                isToday(date) ? 'text-brand-600' : 'text-neutral-500'
              }`}
            >
              {formatDateWithDay(date)}
              {isToday(date) ? ` · ${t('common.today')}` : ''}
            </Text>
            <View className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
              {dayItems.map((it) => (
                <View key={it.id} className="p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
                      <Church size={20} color="#EA580C" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-neutral-900">
                        {it.judul}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {it.jam}
                        {it.jamSelesai ? ` – ${it.jamSelesai}` : ''}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {it.cabang?.nama ?? t('event.synod_level')}
                      </Text>
                      {it.lokasi ? (
                        <View className="flex-row items-center gap-1 mt-1">
                          <MapPin size={11} color="#737373" />
                          <Text className="text-[11px] text-neutral-500">{it.lokasi}</Text>
                        </View>
                      ) : null}
                      {it.isOnline ? (
                        <View className="flex-row items-center gap-1 mt-1">
                          <Video size={11} color="#2563EB" />
                          <Text className="text-[11px] text-blue-700">{t('common.online')}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {/* Akses Online button — kalau ibadah online + link tersedia */}
                  {(() => {
                    const onlineLink = getOnlineLink(it);
                    if (!it.isOnline || !onlineLink) return null;
                    return (
                      <Pressable
                        onPress={() => Linking.openURL(onlineLink).catch(() => {})}
                        className="mt-3 bg-emerald-500 rounded-xl py-2 flex-row items-center justify-center gap-2"
                      >
                        <Video size={14} color="#fff" />
                        <Text className="text-white text-xs font-semibold">
                          {t('ibadah.access_online')}
                        </Text>
                      </Pressable>
                    );
                  })()}
                  {/* Read-only — CTA daftar untuk check-in */}
                  <Pressable
                    onPress={promptSignup}
                    className="mt-3 bg-neutral-100 rounded-xl py-2 items-center"
                  >
                    <Text className="text-xs text-neutral-600 font-medium">
                      {t('guest.cta_signup_to_checkin')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
