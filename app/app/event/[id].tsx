import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, ChevronRight, Clock, FileText, HandHeart, MapPin, PlayCircle, Receipt, Share2, Upload, User, Users, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { useToast } from '@/components/ui/Toast';
import { selfCancelParticipation } from '@/api/event';
import { useEventDetail, useMyEventParticipations } from '@/hooks/useEvents';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { useAuthStore } from '@/stores/auth.store';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { ApiError } from '@/types/api';
import { formatDate } from '@/utils/date';
import { buildEventShareUrl } from '@/utils/share';
import { env } from '@/config/env';
import type { EventParticipation } from '@/types/event';

/** Build per-cabang persembahan URL — per BE notice 2026-08-31 */
function buildPersembahanUrl(cabangKode: string | null | undefined): string {
  const base = 'https://eccchurch.global/persembahan';
  if (cabangKode && cabangKode.trim().length > 0) {
    return `${base}/${encodeURIComponent(cabangKode.trim())}`;
  }
  return base;
}

export default function EventDetailScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isGuest = useAuthStore((s) => s.isGuest);

  const query = useEventDetail(id);
  const event = query.data;
  const { branch: viewingBranch } = useViewingBranch();

  // Family multi-participation list per BE update 2026-08-31.
  // Include self + JemaatRelasi direct + spouse-transitive. Skip BATAL.
  // Untuk guest → hook gated → returns empty.
  const familyQuery = useMyEventParticipations(id);
  const familyParticipations: EventParticipation[] = familyQuery.data ?? [];

  function handleShare() {
    if (!event) return;
    const lines: string[] = [event.judul];
    // Format tanggal human-readable (mis. "5 Sep 2026") — bukan ISO raw
    if (event.tanggalMulai) {
      const dateStr = formatDate(event.tanggalMulai, lang);
      const endStr =
        event.tanggalSelesai && event.tanggalSelesai !== event.tanggalMulai
          ? ` - ${formatDate(event.tanggalSelesai, lang)}`
          : '';
      // Include jam kalau ada — BE patch 2026-05-22a
      const jam = event.jamMulai
        ? ` · ${event.jamMulai}${event.jamSelesai ? `-${event.jamSelesai}` : ''} WIB`
        : '';
      lines.push(`📅 ${dateStr}${endStr}${jam}`);
    }
    if (event.lokasi && event.lokasi.trim()) {
      lines.push(`📍 ${event.lokasi}`);
    }
    if (event.ringkasan) {
      lines.push('');
      lines.push(event.ringkasan);
    }
    // Universal Link — kalau recipient punya app installed → langsung buka
    // di app. Kalau tidak → open di browser (fallback).
    lines.push('');
    lines.push(buildEventShareUrl(event.id));
    lines.push('');
    lines.push(t('common.share_signature'));
    Share.share({ title: event.judul, message: lines.join('\n') });
  }

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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedParticipation, setSelectedParticipation] =
    useState<EventParticipation | null>(null);
  const queryClient = useQueryClient();

  // Mutation cancel — per BE update 2026-08-31: pakai self-cancel per-id.
  // Support cancel participation self OR family (guard di BE side).
  const cancelMutation = useMutation({
    mutationFn: async (participationId: string) => {
      if (!event) throw new Error('Missing event');
      return selfCancelParticipation(event.id, participationId);
    },
    onSuccess: async (result) => {
      setCancelModalOpen(false);
      // Kalau yang di-cancel adalah participation user sendiri, clean local store
      const cancelledIsSelf = selectedParticipation?.isSelf ?? false;
      if (event && cancelledIsSelf) await removeParticipation(event.id);
      setSelectedParticipation(null);
      showToast(
        result.alreadyCancelled ? t('event.already_cancelled') : t('event.cancel_success'),
        'success',
      );
      if (event && !result.alreadyCancelled) {
        addNotification({
          category: 'event',
          title: t('notif.event_cancel_title'),
          body: t('notif.event_cancel_body', { judul: event.judul }),
          deepLink: `/event/${event.id}`,
        });
      }
      // Invalidate all event queries — detail + my-participation + mine-and-family
      await queryClient.invalidateQueries({ queryKey: ['event', 'detail'] });
      await queryClient.invalidateQueries({ queryKey: ['event', 'mine-and-family', id] });
    },
    onError: (err) => {
      setCancelModalOpen(false);
      if (err instanceof ApiError) {
        if (err.code === 'BAD_REQUEST') {
          showToast(t('event.cancel_blocked_hadir'), 'error');
        } else if (err.code === 'NOT_FOUND') {
          if (event && selectedParticipation?.isSelf) removeParticipation(event.id);
          showToast(t('event.cancel_not_registered'), 'info');
        } else if (err.code === 'FORBIDDEN') {
          showToast(t('event.cancel_not_family'), 'error');
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
  // Per hybrid decision Opsi C (2026-08-31):
  // - NOMINAL_BEBAS (donasi sukarela) → redirect ke web (Apple 3.2.2iv,
  //   charitable donation must be external)
  // - NOMINAL_TETAP (fixed ticket price physical event) → in-app register +
  //   upload bukti + cancel (Apple 3.1.5b allows physical goods/services)
  // - GRATIS → in-app register (no payment involved)
  const isBebasOnly = event?.tipeBayar === 'NOMINAL_BEBAS';
  // Event-specific web page (Phase 1 delivered — info rekening + QRIS +
  // deep-link back button). Data source /public/event/:id.
  const eventPaymentWebUrl = event
    ? `https://eccchurch.global/event/${encodeURIComponent(event.id)}/pembayaran`
    : buildPersembahanUrl(viewingBranch?.kode);
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
      return t('event.free_amount');
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

              {/* Participation trackers — satu card per participation (self +
                  family). Per BE update 2026-08-31 family-multi. Clickable →
                  modal dengan info lengkap + tombol cancel per-tracker.
                  Hidden untuk event GRATIS — tracker card tidak relevan
                  (tidak ada bukti transfer, tidak ada nominal, hanya status
                  DAFTAR). Bottom CTA sudah cukup indikasi "sudah daftar". */}
              {!isFree && familyParticipations.length > 0 ? (
                <View className="mt-4 gap-2">
                  {familyParticipations.length > 1 ? (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-neutral-900">
                        {t('event.family_registrations_title', {
                          count: familyParticipations.length,
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {familyParticipations.map((p) => (
                    <ParticipationStatusCard
                      key={p.id}
                      participation={p}
                      isFree={isFree}
                      lang={lang}
                      onPress={() => {
                        setSelectedParticipation(p);
                        setDetailModalOpen(true);
                      }}
                    />
                  ))}
                </View>
              ) : !isFree && participation ? (
                // Fallback: kalau family list belum ready (offline) tapi ada
                // local participation → tampil sebagai single card read-only.
                // Skip untuk event GRATIS (tracker tidak relevan).
                <ParticipationStatusCard
                  participation={{
                    id: participation.participationId,
                    eventId: event.id,
                    jemaatId:
                      'jemaatId' in participation
                        ? (participation as { jemaatId: string }).jemaatId
                        : '',
                    status: participation.status,
                    nominalBayar:
                      event.myParticipation?.nominalBayar
                        ? String(event.myParticipation.nominalBayar)
                        : '0',
                    registeredAt: new Date(participation.registeredAt).toISOString(),
                    isSelf: true,
                    relationLabel: t('event.detail_self'),
                  }}
                  isFree={isFree}
                  lang={lang}
                  onPress={() => {
                    // Buka modal dengan data yang ada (mungkin partial)
                    if (event.myParticipation) {
                      setSelectedParticipation({
                        ...event.myParticipation,
                        isSelf: true,
                        relationLabel: t('event.detail_self'),
                      });
                      setDetailModalOpen(true);
                    }
                  }}
                />
              ) : null}

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

              {/* Donations history section — hidden di kedua platform untuk
                  konsistensi + hindari borderline Apple 3.2.2(iv) (tracking
                  in-app donation). Riwayat bisa dilihat di web page. */}
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
            {isBebasOnly ? (
              // NOMINAL_BEBAS (donasi sukarela) — redirect ke web
              // (Apple 3.2.2iv compliance untuk charitable donation).
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-xs text-neutral-500">
                    {t('event.fee_label')}
                  </Text>
                  <Text className="text-lg font-bold text-neutral-900">
                    {priceLabel}
                  </Text>
                </View>
                <View className="flex-1">
                  <Button
                    label={t('event.open_web_cta')}
                    onPress={() =>
                      Linking.openURL(eventPaymentWebUrl).catch(() => {})
                    }
                    leftIcon={<HandHeart size={16} color="#fff" />}
                    fullWidth
                    size="lg"
                  />
                </View>
              </View>
            ) : (
              // Bottom CTA hanya show register button (status confirmation
              // section dihapus — sudah tampil per-tracker di atas). Label
              // context-aware: "Daftarkan Peserta Lain" kalau ada tracker
              // aktif, atau "Daftar Sekarang" kalau kosong.
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-xs text-neutral-500">{t('event.fee_label')}</Text>
                  <Text className="text-lg font-bold text-neutral-900">{priceLabel}</Text>
                </View>
                <View className="flex-1">
                  <Button
                    label={
                      isFull
                        ? t('event.quota_full')
                        : familyParticipations.length > 0 || participation
                          ? t('event.register_family_more')
                          : t('event.register_now')
                    }
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

      {/* Participation detail modal — full info: nama, status, bukti, catatan.
          Zoom bukti transfer di-handle di dalam modal (absolute overlay,
          bukan nested Modal). Cancel → close modal → open confirmation modal. */}
      {event && selectedParticipation ? (
        <ParticipationDetailModal
          visible={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            // Delay clear supaya modal close animation smooth
            setTimeout(() => setSelectedParticipation(null), 250);
          }}
          participation={selectedParticipation}
          isFree={isFree}
          lang={lang}
          onContinuePayment={() => {
            // Gap #1 fix (v1.8.1): kirim participationId supaya payment flow
            // support self + family (bukan hardcoded self).
            setDetailModalOpen(false);
            router.push(
              `/event/${id}/payment?participationId=${selectedParticipation.id}` as
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                any,
            );
          }}
          onCancel={() => {
            setDetailModalOpen(false);
            // Delay supaya modal detail close animasi selesai
            setTimeout(() => setCancelModalOpen(true), 250);
          }}
        />
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
            {selectedParticipation ? (
              <Text className="text-xs text-neutral-500 mb-2">
                {selectedParticipation.jemaat?.namaLengkap ?? ''}
                {selectedParticipation.relationLabel
                  ? ` (${selectedParticipation.relationLabel})`
                  : ''}
              </Text>
            ) : null}
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
                  onPress={() => {
                    if (selectedParticipation) {
                      cancelMutation.mutate(selectedParticipation.id);
                    }
                  }}
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

/* ==============================================================
 * PARTICIPATION STATUS CARD — prominent tracker di detail
 * ============================================================== */
function ParticipationStatusCard({
  participation,
  isFree,
  lang,
  onPress,
}: {
  participation: EventParticipation;
  isFree: boolean;
  lang: string;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const status = participation.status;
  const registeredAt = new Date(participation.registeredAt).getTime();
  const nominalBayar = participation.nominalBayar
    ? Number(participation.nominalBayar)
    : null;
  const namaPeserta = participation.jemaat?.namaLengkap;
  const relationLabel = participation.relationLabel;

  const cfg = (() => {
    if (status === 'HADIR')
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-500',
        titleColor: 'text-emerald-900',
        bodyColor: 'text-emerald-700',
        icon: <CheckCircle2 size={20} color="#fff" />,
        title: t('event.status_hadir'),
        body: t('event.attended_thanks'),
      };
    if (status === 'BAYAR')
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-500',
        titleColor: 'text-emerald-900',
        bodyColor: 'text-emerald-700',
        icon: <Check size={20} color="#fff" />,
        title: t('event.status_bayar'),
        body: t('event.see_you_at_event'),
      };
    if (status === 'MENUNGGU_VERIFIKASI')
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        iconBg: 'bg-amber-500',
        titleColor: 'text-amber-900',
        bodyColor: 'text-amber-700',
        icon: <Clock size={20} color="#fff" />,
        title: t('event.status_menunggu'),
        body: t('event.waiting_admin_verification'),
      };
    if (status === 'DAFTAR' && isFree)
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-500',
        titleColor: 'text-emerald-900',
        bodyColor: 'text-emerald-700',
        icon: <Check size={20} color="#fff" />,
        title: t('event.already_registered'),
        body: t('event.see_you_at_event'),
      };
    // DAFTAR + berbayar → belum bayar
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500',
      titleColor: 'text-amber-900',
      bodyColor: 'text-amber-700',
      icon: <Upload size={20} color="#fff" />,
      title: t('event.status_daftar'),
      body: t('event.continue_payment_notice'),
    };
  })();

  const timeAgo = (() => {
    const diff = Date.now() - registeredAt;
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t('notifications.now');
    if (m < 60) return t('notifications.minutes_ago', { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('notifications.hours_ago', { count: h });
    const d = Math.floor(h / 24);
    return t('notifications.days_ago', { count: d });
  })();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={onPress ? { color: 'rgba(0,0,0,0.05)' } : undefined}
      className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 active:opacity-80`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`w-10 h-10 rounded-xl ${cfg.iconBg} items-center justify-center`}
        >
          {cfg.icon}
        </View>
        <View className="flex-1 min-w-0">
          {/* Nama peserta + relation label (badge kecil) */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 min-w-0 flex-row items-center gap-2">
              <Text
                className={`text-base font-bold ${cfg.titleColor}`}
                numberOfLines={1}
              >
                {namaPeserta ?? t('event.detail_self')}
              </Text>
              {relationLabel ? (
                <View className="bg-white/60 px-1.5 py-0.5 rounded">
                  <Text className={`text-[10px] font-semibold ${cfg.bodyColor}`}>
                    {relationLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            {onPress ? <ChevronRight size={16} color="#6B7280" /> : null}
          </View>

          {/* Status title + body */}
          <Text className={`text-sm font-semibold ${cfg.titleColor} mt-1`}>
            {cfg.title}
          </Text>
          <Text className={`text-xs ${cfg.bodyColor} mt-0.5 leading-relaxed`}>
            {cfg.body}
          </Text>

          {/* Meta row */}
          <View className="flex-row items-center gap-4 mt-2.5">
            <View>
              <Text className={`text-[10px] ${cfg.bodyColor} uppercase font-bold`}>
                {t('event.registered_since')}
              </Text>
              <Text className={`text-xs ${cfg.titleColor} font-semibold mt-0.5`}>
                {timeAgo}
              </Text>
            </View>
            {nominalBayar && nominalBayar > 0 ? (
              <View>
                <Text
                  className={`text-[10px] ${cfg.bodyColor} uppercase font-bold`}
                >
                  {t('event.nominal_label')}
                </Text>
                <Text
                  className={`text-xs ${cfg.titleColor} font-semibold mt-0.5`}
                >
                  Rp {nominalBayar.toLocaleString('id-ID')}
                </Text>
              </View>
            ) : null}
          </View>

          {onPress ? (
            <Text className={`text-[10px] ${cfg.bodyColor} mt-2 italic`}>
              {t('event.detail_tap_hint')}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ==============================================================
 * PARTICIPATION DETAIL MODAL — full info: nama peserta, status,
 * bukti transfer image (tap to zoom), catatan admin.
 * ============================================================== */
function ParticipationDetailModal({
  visible,
  onClose,
  participation,
  isFree,
  lang,
  onContinuePayment,
  onCancel,
}: {
  visible: boolean;
  onClose: () => void;
  participation: EventParticipation;
  isFree: boolean;
  lang: string;
  onContinuePayment?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  // Local zoom state — pakai overlay absolute-positioned di DALAM modal ini,
  // BUKAN nested Modal. Nested Modal punya masalah stacking di iOS (zoom modal
  // render di bawah detail modal → tidak terlihat / tap tidak respon).
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  const status = participation.status;
  const registeredAtMs = new Date(participation.registeredAt).getTime();
  const nominalNum = participation.nominalBayar
    ? Number(participation.nominalBayar)
    : 0;
  const namaPeserta = participation.jemaat?.namaLengkap ?? null;
  const relationLabel = participation.relationLabel ?? null;
  const catatan = participation.catatan ?? null;
  const buktiUrl = participation.buktiTransferUrl
    ? participation.buktiTransferUrl.startsWith('http')
      ? participation.buktiTransferUrl
      : `${env.apiBaseUrl}${participation.buktiTransferUrl}`
    : null;
  const paidAt = participation.paidAt ?? null;
  const attendedAt = participation.attendedAt ?? null;
  // Continue payment untuk any participation (self + family) yang berbayar
  // dan masih DAFTAR (belum upload bukti). Gap #1 fix v1.8.1: BE guard sudah
  // allow upload bukti untuk family. Payment.tsx accept ?participationId=.
  const showContinuePayment: boolean =
    !!onContinuePayment && status === 'DAFTAR' && !isFree;
  const showCancel: boolean =
    !!onCancel && status !== 'HADIR' && status !== 'BATAL';

  const statusCfg = (() => {
    if (status === 'HADIR')
      return { label: t('event.status_hadir'), bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (status === 'BAYAR')
      return { label: t('event.status_bayar'), bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (status === 'MENUNGGU_VERIFIKASI')
      return { label: t('event.status_menunggu'), bg: 'bg-amber-100', text: 'text-amber-700' };
    if (status === 'BATAL')
      return { label: t('event.status_batal'), bg: 'bg-neutral-200', text: 'text-neutral-600' };
    return {
      label: isFree ? t('event.already_registered') : t('event.status_daftar'),
      bg: 'bg-amber-100',
      text: 'text-amber-700',
    };
  })();

  const registeredLabel = formatDateTime(registeredAtMs, lang);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Tap backdrop di area atas untuk close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        {/* Modal sheet — fixed height 85% supaya ScrollView bisa flex-1 */}
        <View
          className="bg-white rounded-t-3xl overflow-hidden"
          style={{ height: '85%' }}
        >
          {/* Zoom overlay — absolute inside SAME modal (bukan nested Modal).
              iOS bug workaround: nested Modal render di bawah parent → tap tidak
              responsive. Absolute overlay dalam parent selalu paling atas. */}
          {zoomedUrl ? (
            <Pressable
              onPress={() => setZoomedUrl(null)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.95)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 100,
              }}
            >
              <Image
                source={{ uri: zoomedUrl }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
              <View
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <X size={20} color="#fff" />
              </View>
              <Text className="text-[11px] text-white/70 mt-3 italic">
                {t('common.close') ?? 'Tap untuk tutup'}
              </Text>
            </Pressable>
          ) : null}

          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-neutral-300" />
          </View>

          {/* Header */}
          <View className="px-5 pt-2 pb-3 flex-row items-center justify-between border-b border-neutral-100">
            <Text className="text-lg font-bold text-neutral-900">
              {t('event.detail_modal_title')}
            </Text>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
              accessibilityLabel={t('common.close') ?? 'Close'}
            >
              <X size={18} color="#171717" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          >
            {/* Status pill big */}
            <View className={`self-start px-3 py-1.5 rounded-full ${statusCfg.bg} mb-4`}>
              <Text className={`text-xs font-bold ${statusCfg.text}`}>
                {statusCfg.label}
              </Text>
            </View>

            {/* Nama peserta + relation label */}
            <DetailRow
              icon={<User size={18} color="#EA580C" />}
              label={t('event.detail_participant_label')}
              value={
                namaPeserta
                  ? relationLabel
                    ? `${namaPeserta} • ${relationLabel}`
                    : namaPeserta
                  : relationLabel ?? '—'
              }
            />

            {/* Waktu daftar */}
            <DetailRow
              icon={<Clock size={18} color="#EA580C" />}
              label={t('event.detail_registered_label')}
              value={registeredLabel}
            />

            {/* Waktu bayar */}
            {paidAt ? (
              <DetailRow
                icon={<CheckCircle2 size={18} color="#10B981" />}
                label={t('event.detail_paid_label')}
                value={formatDateTime(new Date(paidAt).getTime(), lang)}
              />
            ) : null}

            {/* Waktu hadir */}
            {attendedAt ? (
              <DetailRow
                icon={<Check size={18} color="#10B981" />}
                label={t('event.detail_attended_label')}
                value={formatDateTime(new Date(attendedAt).getTime(), lang)}
              />
            ) : null}

            {/* Nominal */}
            {!isFree && nominalNum > 0 ? (
              <DetailRow
                icon={<Receipt size={18} color="#EA580C" />}
                label={t('event.detail_nominal_label')}
                value={`Rp ${nominalNum.toLocaleString('id-ID')}`}
              />
            ) : null}

            {/* Bukti transfer — hanya untuk berbayar */}
            {!isFree ? (
              <View className="mt-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center">
                    <FileText size={18} color="#EA580C" />
                  </View>
                  <Text className="text-sm font-bold text-neutral-900">
                    {t('event.detail_bukti_label')}
                  </Text>
                </View>
                {buktiUrl ? (
                  <>
                    <Pressable
                      onPress={() => setZoomedUrl(buktiUrl)}
                      className="rounded-xl overflow-hidden border border-neutral-200 active:opacity-80"
                    >
                      <Image
                        source={{ uri: buktiUrl }}
                        style={{ width: '100%', height: 220 }}
                        resizeMode="cover"
                      />
                    </Pressable>
                    <Text className="text-[11px] text-neutral-500 mt-1.5 italic text-center">
                      {t('event.detail_bukti_tap_view')}
                    </Text>
                  </>
                ) : (
                  <View className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-4 items-center">
                    <Text className="text-xs text-neutral-500 italic">
                      {t('event.detail_bukti_empty')}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Catatan */}
            <View className="mt-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center">
                  <FileText size={18} color="#EA580C" />
                </View>
                <Text className="text-sm font-bold text-neutral-900">
                  {t('event.detail_notes_label')}
                </Text>
              </View>
              <View
                className={`rounded-xl px-3 py-3 border ${
                  catatan
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-neutral-50 border-neutral-100'
                }`}
              >
                <Text
                  className={`text-sm ${catatan ? 'text-neutral-800' : 'text-neutral-500 italic'} leading-relaxed`}
                >
                  {catatan || t('event.detail_notes_empty')}
                </Text>
              </View>
            </View>

            {/* Actions — Continue Payment (untuk self DAFTAR berbayar) +
                Cancel per-tracker. Cancel hidden untuk HADIR/BATAL. */}
            {showContinuePayment || showCancel ? (
              <View className="mt-6 border-t border-neutral-100 pt-4 gap-2">
                {showContinuePayment ? (
                  <Pressable
                    onPress={onContinuePayment}
                    className="bg-brand-500 rounded-xl py-3 items-center active:opacity-80 flex-row justify-center gap-2"
                  >
                    <Upload size={16} color="#fff" />
                    <Text className="text-sm font-semibold text-white">
                      {t('event.continue_payment')}
                    </Text>
                  </Pressable>
                ) : null}
                {showCancel ? (
                  <Pressable
                    onPress={onCancel}
                    className="bg-red-50 border border-red-200 rounded-xl py-3 items-center active:opacity-80"
                  >
                    <Text className="text-sm font-semibold text-red-600">
                      {t('event.cancel_registration')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[10px] text-neutral-500 uppercase font-bold">
          {label}
        </Text>
        <Text className="text-sm text-neutral-900 font-semibold mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Format epoch ms → "31 Aug 2026, 14:32" (id) or "Aug 31, 2026, 2:32 PM" (en) */
function formatDateTime(ms: number, lang: string): string {
  try {
    const d = new Date(ms);
    return d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ms).toISOString();
  }
}
