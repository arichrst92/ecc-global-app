/**
 * Tiket event (satu orang). Dipakai di Reservasi Saya → Event, detail event,
 * dan tampilan penuh (variant="full").
 *
 * Hero mengikuti ukuran upload portal (3:2, 1600×1067). QR = kode jemaat.
 * Geser check-in hanya kalau event mengizinkan self check-in & sudah lunas.
 */
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CircleCheck, CreditCard, MapPin } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import { cancelMyEventTicket, type EventTiket } from '@/api/tiket';
import { useToast } from '@/components/ui/Toast';
import { formatDateWithDay } from '@/utils/date';
import { localTime, zoneTimeText } from '@/utils/time';
import { formatRadius } from '@/utils/selfCheckinLocation';
import { TicketShell } from './TicketShell';
import { SwipeToCheckin } from './SwipeToCheckin';
import { Hint, InfoCell, InfoLine, InlineError, RelasiBadge, StatusPill, TicketQR } from './parts';
import { useOpensLabel, useTicketCheckin, useTicketWindow } from './useTicketCheckin';
import { nc } from '@/theme/ThemeRoot';

const HERO_ASPECT = 3 / 2;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export function eventDateText(ev: EventTiket['event'], lang: string): string {
  const start = formatDateWithDay(ev.tanggalMulai, lang);
  const end = ev.tanggalSelesai && ev.tanggalSelesai.slice(0, 10) !== ev.tanggalMulai.slice(0, 10)
    ? ` – ${formatDateWithDay(ev.tanggalSelesai, lang)}`
    : '';
  return `${start}${end}`;
}

/** Jam event dalam zona cabang + labelnya, mis. "18.00 - 21.00 Waktu Sydney". */
/** Lokasi event diisi admin (bukan kosong / "-"). */
export function hasEventLokasi(ev: { lokasi: string | null }): boolean {
  const l = ev.lokasi?.trim();
  return !!l && l !== '-';
}

export function eventTimeText(ev: EventTiket['event'], lang?: string): string {
  if (!ev.jamMulai || ev.jamMulai === '-') return '';
  return zoneTimeText(ev.jamMulai, ev.jamSelesai, ev.timezone, lang);
}

function statusOf(tk: EventTiket): { key: string; tone: 'green' | 'solidGreen' | 'blue' | 'amber' | 'red' } {
  if (tk.status === 'BATAL') return { key: 'st_BATAL', tone: 'red' };
  if (tk.status === 'HADIR') return { key: 'st_HADIR', tone: 'solidGreen' };
  if (tk.payment === 'LUNAS') return { key: 'st_LUNAS', tone: 'green' };
  if (tk.payment === 'MENUNGGU') return { key: 'st_MENUNGGU', tone: 'amber' };
  if (tk.payment === 'BELUM_BAYAR') return { key: 'st_BELUM_BAYAR', tone: 'amber' };
  return { key: 'st_DAFTAR', tone: 'blue' };
}

export function EventTicketCard({
  ticket: tk,
  variant = 'list',
  onPress,
  notchColor,
  compact,
  onCancelled,
}: {
  ticket: EventTiket;
  variant?: 'list' | 'full';
  onPress?: () => void;
  notchColor?: string;
  /** Dipanggil setelah tiket berhasil dibatalkan (mis. layar tiket → kembali ke Reservasi). */
  onCancelled?: () => void;
  /** Di halaman detail event: tanpa gambar & judul/tanggal (sudah tampil di atas). */
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const full = variant === 'full';
  const ev = tk.event;
  const st = statusOf(tk);
  const unpaid = tk.payment === 'MENUNGGU' || tk.payment === 'BELUM_BAYAR';
  const win = useTicketWindow(tk.selfCheckin.opensAt, tk.selfCheckin.closesAt);
  const opensLabel = useOpensLabel(tk.selfCheckin.opensAt);
  const ck = useTicketCheckin({
    kind: 'event',
    targetId: ev.id,
    jemaatId: tk.jemaat.id,
    namaLengkap: tk.jemaat.namaLengkap,
    venue: tk.selfCheckin.venue,
  });
  const hadir = tk.status === 'HADIR';
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const cancel = useMutation({
    mutationFn: () => cancelMyEventTicket(tk.id),
    onSuccess: () => {
      showToast(t('tiket.event_cancelled'), 'success');
      onCancelled?.();
      void qc.invalidateQueries({ queryKey: ['event-tiket'] });
      void qc.invalidateQueries({ queryKey: ['event'] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t('error.generic'), 'error'),
  });
  const askCancel = () =>
    Alert.alert(t('tiket.event_cancel_title'), t('tiket.event_cancel_body', { name: tk.jemaat.namaLengkap, event: ev.judul }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('reservasi.cancel_confirm'), style: 'destructive', onPress: () => cancel.mutate() },
    ]);
  const relasi = tk.relasi ? <RelasiBadge label={tk.relasi} tamu={tk.jemaat.isTamu} /> : null;

  const header = (
    <View>
      <HeroImage url={ev.heroImageUrl} fallbackEmoji="🎉" emojiSize={full ? 64 : 44} style={{ width: '100%', aspectRatio: HERO_ASPECT }} />
      {ev.cabang ? (
        <View className="absolute left-2.5 bottom-2.5 bg-white/95 rounded-full px-2 py-0.5">
          <Text className="text-[10px] font-bold text-brand-700">{ev.cabang.nama}</Text>
        </View>
      ) : null}
    </View>
  );

  const body = full ? (
    <View>
      <Text className="text-lg font-bold text-neutral-900 mb-2">{ev.judul}</Text>
      <View className="flex-row flex-wrap">
        <InfoCell label={t('tiket.date')} value={eventDateText(ev, i18n.language)} />
        {/* Jam / lokasi tidak diisi admin → sel tidak ditampilkan. */}
        {eventTimeText(ev, i18n.language) ? <InfoCell label={t('tiket.time')} value={eventTimeText(ev, i18n.language)} /> : null}
        {hasEventLokasi(ev) ? <InfoCell label={t('tiket.location')} value={ev.lokasi!.trim()} /> : null}
        <InfoCell
          label={t('tiket.fee')}
          value={
            ev.tipeBayar === 'GRATIS'
              ? t('tiket.free')
              : `${tk.totalBayar > 0 ? rp(tk.totalBayar) : ev.nominal ? rp(ev.nominal) : '-'} · ${t(`tiket.${st.key}`)}`
          }
        />
      </View>
    </View>
  ) : (
    <View>
      <Text className="text-sm font-bold text-neutral-900" numberOfLines={2}>
        {ev.judul}
      </Text>
      <InfoLine icon={<CalendarDays size={11} color={nc('#737373')} />}>
        {eventDateText(ev, i18n.language)}
        {eventTimeText(ev, i18n.language) ? ` · ${eventTimeText(ev, i18n.language)}` : ''}
      </InfoLine>
      {hasEventLokasi(ev) ? <InfoLine icon={<MapPin size={11} color={nc('#737373')} />}>{ev.lokasi}</InfoLine> : null}
    </View>
  );

  const qrDim = unpaid && !hadir;
  // Event tanpa pencatatan kehadiran → tidak perlu QR (tidak ada check-in).
  const noQr = ev.butuhKehadiran === false;
  // Nominal yang diberikan / dibayar (event berbayar & sukarela).
  const paidText = ev.tipeBayar !== 'GRATIS' && tk.totalBayar > 0 ? rp(tk.totalBayar) : null;
  const stub = noQr ? (
    full ? (
      <View className="items-center">
        <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.participant')}</Text>
        <View className="flex-row items-center gap-1.5 mb-3">
          <Text className="text-base font-bold text-neutral-900">{tk.jemaat.namaLengkap}</Text>
          {relasi}
        </View>
        <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center">
          <CircleCheck size={32} color="#059669" />
        </View>
        <Text className="mt-2 text-sm font-semibold text-neutral-800">{t('tiket.registered')}</Text>
        {paidText ? <Text className="mt-1 text-base font-bold text-neutral-900">{paidText}</Text> : null}
        <View className="mt-2">
          <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
        </View>
      </View>
    ) : (
      <View className="flex-row items-center gap-2.5">
        <View className="w-[46px] h-[46px] rounded-xl bg-emerald-50 items-center justify-center">
          <CircleCheck size={22} color="#059669" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.participant')}</Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[13px] font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
              {tk.jemaat.namaLengkap}
            </Text>
            {relasi}
          </View>
          {paidText ? <Text className="text-[11px] font-semibold text-neutral-700">{paidText}</Text> : null}
        </View>
        <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
      </View>
    )
  ) : full ? (
    <View className="items-center">
      <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.participant')}</Text>
      <View className="flex-row items-center gap-1.5 mb-3">
        <Text className="text-base font-bold text-neutral-900">{tk.jemaat.namaLengkap}</Text>
        {relasi}
      </View>
      <View style={{ opacity: qrDim ? 0.15 : 1 }}>
        <TicketQR value={tk.jemaat.kode} size={190} />
      </View>
      <Text className="mt-2 text-base font-bold tracking-[4px] text-neutral-900" style={{ fontVariant: ['tabular-nums'] }}>
        {tk.jemaat.kode ?? '—'}
      </Text>
      <View className="mt-2">
        <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
      </View>
    </View>
  ) : (
    <View className="flex-row items-center gap-2.5">
      <View style={{ opacity: qrDim ? 0.15 : 1 }}>
        <TicketQR value={tk.jemaat.kode} size={46} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.participant')}</Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
            {tk.jemaat.namaLengkap}
          </Text>
          {relasi}
        </View>
        <Text className="text-[10px] text-neutral-500 tracking-widest">{tk.jemaat.kode ?? ''}</Text>
        {paidText ? <Text className="text-[11px] font-semibold text-neutral-700">{paidText}</Text> : null}
      </View>
      <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
    </View>
  );

  // ---- bagian bawah: check-in / bayar / petunjuk
  let footer: React.ReactNode = null;
  if (tk.status === 'BATAL' || tk.ended) {
    footer = null;
  } else if (hadir) {
    footer = <SwipeToCheckin state="DONE" label={t('tiket.done', { time: localTime(tk.attendedAt) })} onConfirm={() => {}} />;
  } else if (unpaid) {
    footer = (
      <View>
        <Pressable
          onPress={() => router.push(`/event/${ev.id}` as never)}
          className="rounded-full border border-amber-300 bg-amber-50 py-2.5 flex-row items-center justify-center gap-1.5"
        >
          <CreditCard size={14} color={nc('#B45309')} />
          <Text className="text-xs font-bold text-amber-800">{t('tiket.pay_now')}</Text>
        </Pressable>
        <Hint tone="amber" text={t('tiket.waiting_verify')} />
      </View>
    );
  } else if (noQr) {
    footer = <Hint text={t('tiket.no_checkin')} />;
  } else if (!tk.selfCheckin.enabled) {
    footer = <Hint text={t('tiket.show_qr_usher')} />;
  } else if (win !== 'CLOSED') {
    footer = (
      <View>
        <SwipeToCheckin
          size={full ? 'lg' : 'md'}
          state={win === 'LOCKED' ? 'LOCKED' : ck.busy ? 'BUSY' : 'READY'}
          label={win === 'LOCKED' ? opensLabel : t('tiket.swipe')}
          onConfirm={ck.checkin}
        />
        {win === 'OPEN' && tk.selfCheckin.venue?.requiresLocation && !ck.error ? (
          <Hint text={t('tiket.radius_note', { radius: formatRadius(tk.selfCheckin.venue.radiusM ?? 0) })} />
        ) : null}
        <InlineError text={ck.error} />
      </View>
    );
  }

  // Batalkan tiket (gratis / belum bayar, sebelum event mulai) — di bawah aksi lain.
  if (tk.canCancel && tk.status !== 'BATAL' && !hadir && !tk.ended) {
    const cancelBtn = (
      <Pressable
        onPress={askCancel}
        disabled={cancel.isPending}
        className="self-center mt-2.5 px-3 py-1 rounded-full border border-red-200"
      >
        <Text className="text-[11px] font-semibold text-red-600">{cancel.isPending ? '…' : t('reservasi.cancel_btn')}</Text>
      </Pressable>
    );
    footer = (
      <View>
        {footer}
        {cancelBtn}
      </View>
    );
  }

  return (
    <TicketShell
      header={compact ? null : header}
      body={compact ? null : body}
      stub={stub}
      footer={footer}
      onPress={onPress}
      notchColor={notchColor}
      dim={tk.status === 'BATAL'}
    />
  );
}
