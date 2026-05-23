import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Clock, MapPin, QrCode, Users } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { getIbadahDetail } from '@/api/ibadah';
import { formatDateWithDay } from '@/utils/date';

export default function IbadahDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, tanggal } = useLocalSearchParams<{ id: string; tanggal?: string }>();
  const lang = i18n.language;

  // queryKey include tanggal supaya cache-aware per-occurrence (mis. petugas
  // berbeda Minggu 17 Mei vs Minggu 24 Mei → 2 cache entries terpisah)
  const query = useQuery({
    queryKey: ['ibadah', 'detail', id, tanggal ?? null],
    queryFn: () => getIbadahDetail(id, tanggal),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const ibadah = query.data;

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Hero header */}
      <View className="bg-brand-500 pb-6 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Text className="flex-1 text-white text-base font-semibold text-center mr-10">
              {t('ibadah.detail_title')}
            </Text>
          </View>

          {ibadah ? (
            <View className="px-5 pt-4">
              {ibadah.kategoriIbadah ? (
                <View className="bg-white/15 rounded-full px-3 py-1 self-start mb-2">
                  <Text className="text-xs text-white font-medium">
                    {ibadah.kategoriIbadah.nama}
                  </Text>
                </View>
              ) : null}
              <Text className="text-2xl font-bold text-white">{ibadah.nama}</Text>
              <Text className="text-white/80 text-sm mt-1">{ibadah.cabang.nama}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      >
        {query.isPending ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-20">
            <Text className="text-sm text-red-600">{t('error.generic')}</Text>
            <Pressable onPress={() => query.refetch()} className="mt-3 px-4 py-2 bg-brand-500 rounded-lg">
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : ibadah ? (
          <>
            {/* Specific date — tampil prominent kalau navigate dari list dengan
                tanggal occurrence di URL param. Lebih informatif dari hari
                generic dari ibadah master schedule. */}
            {tanggal ? (
              <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                  <Calendar size={18} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">{t('ibadah.date_label')}</Text>
                  <Text className="font-semibold text-neutral-900">
                    {formatDateWithDay(tanggal, lang)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Info grid */}
            <View className="flex-row gap-3 mb-3">
              <InfoCard
                icon={<Clock size={18} color="#EA580C" />}
                label={t('ibadah.time')}
                value={`${ibadah.jamMulai} - ${ibadah.jamSelesai}`}
              />
              <InfoCard
                icon={<Calendar size={18} color="#EA580C" />}
                label={t('ibadah.schedule')}
                value={
                  ibadah.tipeJadwal === 'WEEKLY' && ibadah.hari
                    ? t('ibadah.every_day', { day: ibadah.hari })
                    : ibadah.tipeJadwal
                }
              />
            </View>

            {/* Location */}
            <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                  <MapPin size={18} color="#EA580C" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-neutral-500">{t('ibadah.location')}</Text>
                  <Text className="font-semibold text-neutral-900">{ibadah.lokasi}</Text>
                  {ibadah.isOnline ? (
                    <Text className="text-xs text-emerald-600 mt-0.5">{t('ibadah.online_service')}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Petugas — per BE patch 23a tap nama → /jemaat/[id] view-only profile */}
            {ibadah.petugas && ibadah.petugas.length > 0 ? (
              <View className="bg-white rounded-2xl p-4 border border-neutral-100">
                <View className="flex-row items-center gap-2 mb-3">
                  <Users size={16} color="#525252" />
                  <Text className="text-sm font-semibold text-neutral-700">{t('ibadah.team')}</Text>
                </View>
                <View className="gap-2.5">
                  {ibadah.petugas.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/jemaat/${p.jemaat.id}` as never)}
                      className="flex-row items-center gap-3"
                    >
                      <Avatar name={p.jemaat.namaLengkap} fotoUrl={p.jemaat.fotoUrl} size={32} />
                      <View className="flex-1">
                        <Text className="text-xs text-neutral-500">
                          {p.pelayananNama} · {p.role}
                        </Text>
                        <Text className="text-sm font-medium text-neutral-900">{p.jemaat.namaLengkap}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View className="bg-neutral-100 rounded-2xl p-4 items-center">
                <Text className="text-xs text-neutral-500">{t('ibadah.team_tba')}</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="bg-white border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          <Button
            label={t('ibadah.show_my_qr')}
            onPress={() => router.push('/qr-card')}
            leftIcon={<QrCode size={16} color="#fff" />}
            fullWidth
            size="lg"
          />
        </SafeAreaView>
      </View>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-xl p-3 border border-neutral-100">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs text-neutral-500">{label}</Text>
      </View>
      <Text className="font-semibold text-neutral-900 text-sm mt-1">{value}</Text>
    </View>
  );
}
