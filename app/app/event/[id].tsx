import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, Clock, HandHeart, MapPin, PlayCircle, Share2, Upload, Users, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { useToast } from '@/components/ui/Toast';
import { cancelMyParticipation } from '@/api/event';
import { useEventDetail, useMyDonations } from '@/hooks/useEvents';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import { formatDate } from '@/utils/date';
import type { EventDonation } from '@/types/event';

export default function EventDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isGuest = useAuthStore((s) => s.isGuest);

  const query = useEventDetail(id);
  const event = query.data;

  function handleShare() {
    if (!event) return;
    const lines: string[] = [event.judul];
    if (event.tanggalMulai) lines.push(event.tanggalMulai);
    if (event.lokasi) lines.push(event.lokasi);
    if (event.ringkasan) {
      lines.push('');
      lines.push(event.ringkasan);
    }
    Share.share({ message: lines.join('\n') });
  }

  // Donations history khusus NOMINAL_BEBAS — per BE patch 2026-05-21l.
  // Disabled untuk guest mode — endpoint require auth + guest tidak punya donations.
  const isBebas = event?.tipeBayar === 'NOMINAL_BEBAS';
  const donationsQuery = useMyDonations(id, !!event && isBebas && !isGuest);

  const addParticipation = useEventFlowStore((s) => s.addParticipation);
  const removeParticipation = useEventFlowStore((s) => s.removeParticipation);
  const localParticipation = useEventFlowStore((s) =>
    event ? s.getParticipation(event.id) : null,
  );

  // Sync BE → local store. Per BE patch 2026-05-21i, event detail include
  // `myParticipation`. BE jadi source of truth — kalau local stale, fix it.
  useEffect(() => {
    if (!event) return;
    const beParticipation = event.myParticipation;
    if (beParticipation && beParticipation.status !== 'BATAL') {
      // BE punya data → update local kalau berbeda
      if (
        !localParticipation ||
        localParticipation.participationId !== beParticipation.id ||
        localParticipation.status !== beParticipation.status
      ) {
        addParticipation({
          participationId: beParticipation.id,
          eventId: event.id,
          status: beParticipation.status,
          registeredAt: new Date(beParticipation.registeredAt).getTime(),
        });
      }
    } else {
      // BE confirm belum daftar (null atau BATAL) → bersihkan local stale
      if (localParticipation) {
        removeParticipation(event.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.myParticipation?.id, event?.myParticipation?.status]);

  // Untuk render, prefer BE participation. Fallback ke local (offline mode).
  // BATAL = sudah cancel → treat sebagai not-registered (user bisa re-register).
  // BE patch 21g support reactivate row BATAL ke DAFTAR saat user POST register lagi.
  // Catatan: kalau BE jawab BATAL, abaikan local cache juga (stale dari sebelum cancel).
  const beHasResponded = !!event;
  const beSaysBatal =
    !!event?.myParticipation && event.myParticipation.status === 'BATAL';
  const beActive =
    event?.myParticipation && event.myParticipation.status !== 'BATAL'
      ? event.myParticipation
      : null;
  const participation = beActive
    ? {
        participationId: beActive.id,
        eventId: event!.id,
        status: beActive.status,
        registeredAt: new Date(beActive.registeredAt).getTime(),
        jemaatId: beActive.jemaatId,
      }
    : // BE belum respon → trust local. BE bilang BATAL → ignore local stale.
      beHasResponded && beSaysBatal
      ? null
      : localParticipation;

  const showToast = useToast((s) => s.show);
  const addNotification = useNotificationsStore((s) => s.add);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Mutation cancel registration
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Missing event');
      return cancelMyParticipation(event.id);
    },
    onSuccess: async (result) => {
      setCancelModalOpen(false);
      if (event) await removeParticipation(event.id);
      showToast(
        result.alreadyCancelled ? t('event.already_cancelled') : t('event.cancel_success'),
        'success',
      );
      // Local notification — pendaftaran dibatalkan (skip kalau alreadyCancelled
      // dari sisi BE, supaya tidak spam notif yang sama)
      if (event && !result.alreadyCancelled) {
        addNotification({
          category: 'event',
          title: t('notif.event_cancel_title'),
          body: t('notif.event_cancel_body', { judul: event.judul }),
          deepLink: `/event/${event.id}`,
        });
      }
      // Invalidate event queries supaya myParticipation di detail re-fetch
      // dan tombol kembali jadi "Daftar Sekarang"
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'my-participation', id] });
    },
    onError: (err) => {
      setCancelModalOpen(false);
      if (err instanceof ApiError) {
        if (err.code === 'BAD_REQUEST') {
          showToast(t('event.cancel_blocked_hadir'), 'error');
        } else if (err.code === 'NOT_FOUND') {
          // User belum daftar (stale local state) — clean up local
          if (event) removeParticipation(event.id);
          showToast(t('event.cancel_not_registered'), 'info');
        } else {
          showToast(err.message, 'error');
        }
      } else {
        showToast(t('error.network'), 'error');
      }
    },
  });

  const isFree = event?.tipeBayar === 'GRATIS';
  const isFull = event?.quotaPeserta != null && event.pesertaCount >= event.quotaPeserta;
  const priceLabel = (() => {
    if (!event) return '';
    if (event.tipeBayar === 'GRATIS') return t('event.free');
    if (event.tipeBayar === 'NOMINAL_BEBAS') {
      // Kalau user sudah daftar dengan nominal tertentu, tampil amount-nya.
      // Otherwise tampil generic "Persembahan" untuk user yang belum daftar.
      const userNominal =
        event.myParticipation?.nominalBayar
          ? Number(event.myParticipation.nominalBayar)
          : participation?.nominalBayar ?? null;
      if (userNominal && userNominal > 0) {
        return `Rp ${userNominal.toLocaleString('id-ID')}`;
      }
      return lang === 'id' ? 'Persembahan' : 'Donation';
    }
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
              <Pressable
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
                accessibilityLabel={t('common.share')}
              >
                <Share2 size={18} color="#fff" />
              </Pressable>
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
            {/* Hero block — pakai heroImageUrl kalau ada */}
            <HeroImage
              url={event.heroImageUrl}
              fallbackEmoji="🎉"
              emojiSize={96}
              className="h-72"
            />

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
                {/* Jam mulai - selesai — prefer BE jamMulai/jamSelesai (BE patch 2026-05-22a),
                    fallback ke parse dari ISO untuk event lama */}
                {(() => {
                  const range = formatTimeRange(event);
                  return range ? (
                    <MetaRow
                      icon={<Clock size={20} color="#EA580C" />}
                      primary={range}
                    />
                  ) : null;
                })()}
                <MetaRow
                  icon={<MapPin size={20} color="#EA580C" />}
                  primary={
                    event.lokasi && event.lokasi.trim().length > 0
                      ? event.lokasi
                      : t('event.location_tba')
                  }
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

              {/* Video teaser button — kalau BE provide videoUrl */}
              {event.videoUrl && event.videoUrl.trim().length > 0 ? (
                <Pressable
                  onPress={() => Linking.openURL(event.videoUrl!).catch(() => {})}
                  className="mt-4 bg-red-500 rounded-2xl py-3 flex-row items-center justify-center gap-2"
                >
                  <PlayCircle size={20} color="#fff" />
                  <Text className="text-white font-semibold text-base">
                    {t('event.watch_teaser')}
                  </Text>
                </Pressable>
              ) : null}

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

              {/* Donations history — khusus NOMINAL_BEBAS yang punya donations */}
              {isBebas && donationsQuery.data && donationsQuery.data.donations.length > 0 ? (
                <DonationsHistory
                  donations={donationsQuery.data.donations}
                  totalConfirmed={donationsQuery.data.totalConfirmed}
                  lang={lang}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA — conditional based on participation status.
          Hidden untuk guest mode — event read-only, hanya teaser video
          tetap interactive di scrollable content. */}
      {event && !isGuest ? (
        <View className="bg-white border-t border-neutral-100 px-5 py-3">
          <SafeAreaView edges={['bottom']}>
            {isBebas ? (
              // NOMINAL_BEBAS: special CTA "Beri Donasi" / "Beri Donasi Lagi"
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-xs text-neutral-500">{t('event.total_given')}</Text>
                  <Text className="text-lg font-bold text-blue-600">
                    Rp{' '}
                    {(donationsQuery.data?.totalConfirmed ?? 0).toLocaleString('id-ID')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Button
                    label={
                      (donationsQuery.data?.donations.length ?? 0) > 0
                        ? t('event.donate_again')
                        : t('event.donate_now')
                    }
                    onPress={() => router.push(`/event/${id}/donate`)}
                    leftIcon={<HandHeart size={16} color="#fff" />}
                    fullWidth
                    size="lg"
                  />
                </View>
              </View>
            ) : participation ? (
              <ParticipationCTA
                status={participation.status}
                tipeBayar={event.tipeBayar}
                priceLabel={priceLabel}
                onContinuePayment={() => router.push(`/event/${id}/payment`)}
                onCancel={() => setCancelModalOpen(true)}
              />
            ) : (
              // Belum daftar — show normal register CTA
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
            )}
          </SafeAreaView>
        </View>
      ) : null}

      {/* Cancel confirmation modal */}
      <Modal
        visible={cancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalOpen(false)}
      >
        <Pressable
          onPress={() => setCancelModalOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('event.cancel_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('event.cancel_confirm_msg')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setCancelModalOpen(false)}
                  fullWidth
                  disabled={cancelMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('event.confirm_cancel')}
                  variant="danger"
                  onPress={() => cancelMutation.mutate()}
                  fullWidth
                  loading={cancelMutation.isPending}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ParticipationCTA({
  status,
  tipeBayar,
  priceLabel,
  onContinuePayment,
  onCancel,
}: {
  status: 'DAFTAR' | 'MENUNGGU_VERIFIKASI' | 'BAYAR' | 'HADIR' | 'BATAL';
  tipeBayar: 'GRATIS' | 'NOMINAL_TETAP' | 'NOMINAL_BEBAS';
  priceLabel: string;
  onContinuePayment: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const isFree = tipeBayar === 'GRATIS';
  // Status yang bisa di-cancel (per BE: DAFTAR, MENUNGGU_VERIFIKASI, BAYAR)
  const canCancel = status === 'DAFTAR' || status === 'MENUNGGU_VERIFIKASI' || status === 'BAYAR';

  // DAFTAR + berbayar → user sudah daftar tapi belum upload bukti
  if (status === 'DAFTAR' && !isFree) {
    return (
      <View>
        <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 flex-row items-center gap-2">
          <Clock size={16} color="#D97706" />
          <Text className="text-xs text-amber-800 flex-1 font-medium">
            {t('event.continue_payment_notice')}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mb-2">
          <View>
            <Text className="text-xs text-neutral-500">{t('event.fee_label')}</Text>
            <Text className="text-lg font-bold text-neutral-900">{priceLabel}</Text>
          </View>
          <View className="flex-1">
            <Button
              label={t('event.continue_payment')}
              onPress={onContinuePayment}
              fullWidth
              size="lg"
              leftIcon={<Upload size={16} color="#fff" />}
            />
          </View>
        </View>
        <Pressable onPress={onCancel} className="py-2 items-center">
          <Text className="text-sm font-medium text-red-600">{t('event.cancel_registration')}</Text>
        </Pressable>
      </View>
    );
  }

  // MENUNGGU_VERIFIKASI → user sudah upload bukti, tunggu admin
  if (status === 'MENUNGGU_VERIFIKASI') {
    return (
      <View>
        <View className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center">
            <Clock size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-amber-900 text-sm">{t('event.status_menunggu')}</Text>
            <Text className="text-xs text-amber-700 mt-0.5">
              {t('event.waiting_admin_verification')}
            </Text>
          </View>
        </View>
        {canCancel ? (
          <Pressable onPress={onCancel} className="py-2 mt-2 items-center">
            <Text className="text-sm font-medium text-red-600">{t('event.cancel_registration')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // BAYAR → confirmed, tunggu hari H untuk hadir
  if (status === 'BAYAR') {
    return (
      <View>
        <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
            <CheckCircle2 size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-emerald-900 text-sm">{t('event.status_bayar')}</Text>
            <Text className="text-xs text-emerald-700 mt-0.5">
              {t('event.see_you_at_event')}
            </Text>
          </View>
        </View>
        {canCancel ? (
          <Pressable onPress={onCancel} className="py-2 mt-2 items-center">
            <Text className="text-sm font-medium text-red-600">{t('event.cancel_registration')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // HADIR atau DAFTAR-gratis → success, no cancel button (HADIR rejected by BE)
  return (
    <View>
      <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
          <Check size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-emerald-900 text-sm">
            {status === 'HADIR' ? t('event.status_hadir') : t('event.already_registered')}
          </Text>
          <Text className="text-xs text-emerald-700 mt-0.5">
            {status === 'HADIR' ? t('event.attended_thanks') : t('event.see_you_at_event')}
          </Text>
        </View>
      </View>
      {/* DAFTAR-gratis bisa cancel */}
      {status === 'DAFTAR' && isFree ? (
        <Pressable onPress={onCancel} className="py-2 mt-2 items-center">
          <Text className="text-sm font-medium text-red-600">{t('event.cancel_registration')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DonationsHistory({
  donations,
  totalConfirmed,
  lang,
}: {
  donations: EventDonation[];
  totalConfirmed: number;
  lang: string;
}) {
  const { t } = useTranslation();
  // Sort newest first
  const sorted = [...donations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <View className="mt-6">
      <View className="flex-row items-baseline justify-between mb-3">
        <Text className="text-lg font-bold text-neutral-900">
          {t('event.donations_history')}
        </Text>
        <Text className="text-xs text-neutral-500">
          {donations.length} {t('event.donations_count')}
        </Text>
      </View>

      {/* Total summary */}
      <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-3 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center">
          <CheckCircle2 size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-emerald-700">{t('event.total_confirmed')}</Text>
          <Text className="text-xl font-bold text-emerald-900">
            Rp {totalConfirmed.toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* List */}
      <View className="gap-2">
        {sorted.map((d) => (
          <DonationRow key={d.id} donation={d} lang={lang} />
        ))}
      </View>
    </View>
  );
}

function DonationRow({ donation, lang }: { donation: EventDonation; lang: string }) {
  const { t } = useTranslation();
  const isBayar = donation.status === 'BAYAR';
  const isWaiting = donation.status === 'MENUNGGU_VERIFIKASI';
  const isCancelled = donation.status === 'BATAL';

  const statusLabel = isBayar
    ? t('event.status_bayar')
    : isWaiting
      ? t('event.status_menunggu')
      : t('event.status_batal');
  const statusColor = isBayar
    ? 'bg-emerald-100 text-emerald-700'
    : isWaiting
      ? 'bg-amber-100 text-amber-700'
      : 'bg-neutral-200 text-neutral-600';

  return (
    <View
      className={`bg-white rounded-2xl p-3 border border-neutral-100 ${
        isCancelled ? 'opacity-60' : ''
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text
            className={`text-base font-bold ${
              isCancelled ? 'text-neutral-500 line-through' : 'text-neutral-900'
            }`}
          >
            Rp {Number(donation.nominalBayar).toLocaleString('id-ID')}
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {formatDate(donation.createdAt, lang)}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${statusColor.split(' ')[0]}`}>
          <Text className={`text-[10px] font-bold ${statusColor.split(' ')[1]}`}>
            {statusLabel}
          </Text>
        </View>
      </View>
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

/**
 * Format event time range. Per BE patch 2026-05-22a — pakai dedicated fields
 * `jamMulai` / `jamSelesai` (format "HH:mm" string, timezone-safe WIB).
 *
 * Priority:
 * 1. Kalau BE fill `jamMulai` → pakai itu (preferred — eksplisit + timezone safe)
 * 2. Fallback: extract dari `tanggalMulai` ISO (untuk event lama yang belum punya
 *    jam fields populated). Kalau jam = 00:00 → date-only event, return null.
 *
 * Contoh output: "09:00 - 12:00 WIB", "Mulai 19:00 WIB", atau null.
 */
function formatTimeRange(event: {
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  jamMulai?: string | null;
  jamSelesai?: string | null;
}): string | null {
  // Path 1: BE jam fields (preferred)
  if (event.jamMulai) {
    if (event.jamSelesai && event.jamSelesai !== event.jamMulai) {
      return `${event.jamMulai} - ${event.jamSelesai} WIB`;
    }
    return `${event.jamMulai} WIB`;
  }

  // Path 2: legacy fallback — parse jam dari ISO
  const start = new Date(event.tanggalMulai);
  const end = event.tanggalSelesai ? new Date(event.tanggalSelesai) : start;
  const startH = start.getHours();
  const startM = start.getMinutes();
  const endH = end.getHours();
  const endM = end.getMinutes();
  if (startH === 0 && startM === 0 && endH === 0 && endM === 0) {
    return null;
  }

  function fmt(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (start.getTime() === end.getTime()) {
    return `${fmt(start)} WIB`;
  }
  return `${fmt(start)} - ${fmt(end)} WIB`;
}
