import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  MapPin,
  QrCode,
  RefreshCw,
  UserCheck,
  Ticket,
  Users,
  Video,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { getIbadahDetail, getSelfCheckin, postSelfCheckin } from '@/api/ibadah';
import { SelfCheckinModal } from '@/components/ibadah/SelfCheckinModal';
import { SelfCheckinCountdown } from '@/components/ibadah/SelfCheckinCountdown';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { selfCheckinOpenNow as selfCheckinOpen, serverNowMs } from '@/utils/serverClock';
import { formatDateWithDay } from '@/utils/date';
import { getStreamLink } from '@/utils/ibadahOnline';

export default function IbadahDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, tanggal } = useLocalSearchParams<{ id: string; tanggal?: string }>();
  const lang = i18n.language;

  // queryKey include tanggal supaya cache-aware per-occurrence (mis. petugas
  // berbeda Minggu 17 Mei vs Minggu 24 Mei → 2 cache entries terpisah).
  // Bump 'v2' 2026-05-24 — invalidate AsyncStorage cache lama dari sebelum
  // BE rename linkStream → linkOnline + add ke response.
  const query = useQuery({
    queryKey: ['ibadah', 'detail', 'v2', id, tanggal ?? null],
    queryFn: () => getIbadahDetail(id, tanggal),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnMount: 'always',
  });

  const ibadah = query.data;
  const showToast = useToast((s) => s.show);

  // Self check-in: status jendela (hari & jam ibadah) + saya & keluarga.
  // Refetch tiap menit supaya tombol muncul/hilang tepat waktu.
  const selfCheckin = useQuery({
    queryKey: ['ibadah', 'self-checkin', id],
    queryFn: () => getSelfCheckin(id),
    enabled: !!id,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const checkinMut = useMutation({ mutationFn: (ids: string[]) => postSelfCheckin(id, ids) });
  const [checkinOpen, setCheckinOpen] = useState(false);

  // Pull to refresh (native) / tombol refresh (web) + refetch saat kembali ke layar.
  const [refreshing, setRefreshing] = useState(false);
  async function refreshAll() {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), selfCheckin.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }
  useRefetchOnFocus(() => {
    query.refetch();
    selfCheckin.refetch();
  }, !!id);

  // Jam acuan = jam server (bukan jam HP) → tombol muncul tepat 15 menit
  // sebelum ibadah & hilang di jam selesai walau jam/zona HP berbeda.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const sc = selfCheckin.data;
  const checkinOpenNow = useMemo(() => selfCheckinOpen(sc), [sc, tick]);
  // Refetch persis di batas buka/tutup supaya status server ikut segar.
  useEffect(() => {
    if (!sc?.opensAt || !sc?.closesAt) return;
    const now = serverNowMs();
    const next = [Date.parse(sc.opensAt), Date.parse(sc.closesAt) + 1000].find((x) => x > now);
    if (!next || next - now > 6 * 60 * 60 * 1000) return;
    const t = setTimeout(() => {
      setTick((x) => x + 1);
      selfCheckin.refetch();
    }, next - now + 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sc?.opensAt, sc?.closesAt, tick]);
  const allCheckedIn =
    !!selfCheckin.data && selfCheckin.data.members.length > 0 && selfCheckin.data.members.every((m) => m.status === 'JOIN');

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
            <Text className="flex-1 text-white text-base font-semibold text-center">
              {t('ibadah.detail_title')}
            </Text>
            {Platform.OS === 'web' ? (
              <Pressable
                onPress={refreshAll}
                className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mr-2"
                accessibilityLabel={t('common.refresh')}
              >
                {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={18} color="#fff" />}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/my-reservasi' as never)}
              className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
              accessibilityLabel={t('ibadah.my_reservations') ?? 'Reservasi Saya'}
            >
              <Ticket size={18} color="#fff" />
            </Pressable>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#F97316" />}
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
            {(() => {
              const streamLink = getStreamLink(ibadah);
              return (
                <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                      <MapPin size={18} color="#EA580C" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-500">{t('ibadah.location')}</Text>
                      <Text className="font-semibold text-neutral-900">{ibadah.lokasi}</Text>
                      {/* Hide "Ibadah Online" indicator kalau link tidak
                          tersedia — supaya tidak misleading saat admin set
                          flag tapi belum masukkan URL. */}
                      {ibadah.isOnline && streamLink ? (
                        <Text className="text-xs text-emerald-600 mt-0.5">{t('ibadah.online_service')}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Stream button — show kalau ada link. Helper accept
                      both `linkOnline` + `linkStream` (BE rename belum
                      fully efektif per device log 2026-05-24). */}
                  {streamLink ? (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(streamLink).catch(() => {
                          // Silent — user might not have suitable app
                        })
                      }
                      className="mt-3 bg-emerald-500 rounded-xl py-3 flex-row items-center justify-center gap-2"
                    >
                      <Video size={18} color="#fff" />
                      <Text className="text-white font-semibold text-sm">
                        {t('ibadah.access_online')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })()}

            {/* Deskripsi — kalau BE provide */}
            {ibadah.deskripsi && ibadah.deskripsi.trim().length > 0 ? (
              <View className="bg-white rounded-2xl p-4 border border-neutral-100 mb-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <FileText size={16} color="#525252" />
                  <Text className="text-sm font-semibold text-neutral-700">
                    {t('ibadah.description')}
                  </Text>
                </View>
                <Text className="text-sm text-neutral-700 leading-relaxed">
                  {ibadah.deskripsi}
                </Text>
              </View>
            ) : null}

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

      {/* Sticky bottom CTA — QR + Self check-in (hanya saat hari & jam ibadah) */}
      <View className="bg-white border-t border-neutral-100 px-5 py-3">
        <SafeAreaView edges={['bottom']}>
          {/* Hitung mundur sampai self check-in dibuka (15 menit sebelum ibadah) */}
          {!checkinOpenNow && sc?.reason === 'TOO_EARLY' && sc.opensAt ? (
            <SelfCheckinCountdown
              opensAt={sc.opensAt}
              onDone={() => {
                setTick((x) => x + 1);
                selfCheckin.refetch();
              }}
            />
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={t('ibadah.show_my_qr')}
                onPress={() => router.push('/qr-card')}
                leftIcon={<QrCode size={16} color={checkinOpenNow ? '#171717' : '#fff'} />}
                variant={checkinOpenNow ? 'secondary' : 'primary'}
                fullWidth
                size="lg"
              />
            </View>
            {checkinOpenNow ? (
              <View className="flex-1">
                <Button
                  label={allCheckedIn ? t('ibadah.self_checkin_done_btn') : t('ibadah.self_checkin_btn')}
                  onPress={() => setCheckinOpen(true)}
                  leftIcon={<UserCheck size={16} color="#fff" />}
                  fullWidth
                  size="lg"
                />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      <SelfCheckinModal
        visible={checkinOpen}
        status={selfCheckin.data}
        loading={checkinMut.isPending}
        onGuestAdded={() => selfCheckin.refetch()}
        onClose={() => setCheckinOpen(false)}
        onConfirm={(ids) =>
          checkinMut.mutate(ids, {
            onSuccess: (r) => {
              setCheckinOpen(false);
              const ok = r.results.filter((x) => x.result === 'CHECKED_IN').map((x) => x.namaLengkap);
              showToast(
                ok.length ? t('ibadah.self_checkin_success', { names: ok.join(', ') }) : t('ibadah.self_checkin_all_done'),
                'success',
              );
              selfCheckin.refetch();
            },
            onError: (e) => {
              showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
              selfCheckin.refetch();
            },
          })
        }
      />
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
