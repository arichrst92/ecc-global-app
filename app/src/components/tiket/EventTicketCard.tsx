/**
 * Tiket event (satu orang). Dipakai di Reservasi Saya → Event, detail event,
 * dan tampilan penuh (variant="full").
 *
 * Hero mengikuti ukuran upload portal (3:2, 1600×1067). QR = kode jemaat.
 * Geser check-in hanya kalau event mengizinkan self check-in & sudah lunas.
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CreditCard, MapPin } from 'lucide-react-native';

import { HeroImage } from '@/components/ui/HeroImage';
import type { EventTiket } from '@/api/tiket';
import { formatDateWithDay } from '@/utils/date';
import { formatVenueRange, localTime } from '@/utils/time';
import { formatRadius } from '@/utils/selfCheckinLocation';
import { TicketShell } from './TicketShell';
import { SwipeToCheckin } from './SwipeToCheckin';
import { HadirStamp, Hint, InfoCell, InfoLine, InlineError, RelasiBadge, StatusPill, TicketQR } from './parts';
import { useOpensLabel, useTicketCheckin, useTicketWindow } from './useTicketCheckin';

const HERO_ASPECT = 3 / 2;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export function eventDateText(ev: EventTiket['event'], lang: string): string {
  const start = formatDateWithDay(ev.tanggalMulai, lang);
  const end = ev.tanggalSelesai && ev.tanggalSelesai.slice(0, 10) !== ev.tanggalMulai.slice(0, 10)
    ? ` – ${formatDateWithDay(ev.tanggalSelesai, lang)}`
    : '';
  return `${start}${end}`;
}

export function eventTimeText(ev: EventTiket['event']): string {
  if (!ev.jamMulai) return '';
  return formatVenueRange(ev.tanggalMulai.slice(0, 10), ev.jamMulai, ev.jamSelesai, ev.timezone, '–');
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
}: {
  ticket: EventTiket;
  variant?: 'list' | 'full';
  onPress?: () => void;
  notchColor?: string;
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
        <InfoCell label={t('tiket.time')} value={eventTimeText(ev) || '-'} />
        <InfoCell label={t('tiket.location')} value={ev.lokasi || ev.cabang?.nama || '-'} />
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
      <InfoLine icon={<CalendarDays size={11} color="#737373" />}>
        {eventDateText(ev, i18n.language)}
        {eventTimeText(ev) ? ` · ${eventTimeText(ev)}` : ''}
      </InfoLine>
      {ev.lokasi ? <InfoLine icon={<MapPin size={11} color="#737373" />}>{ev.lokasi}</InfoLine> : null}
    </View>
  );

  const qrDim = unpaid && !hadir;
  const stub = full ? (
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
      {hadir && tk.attendedAt ? (
        <View style={{ position: 'absolute', right: 0, top: 4 }}>
          <HadirStamp text={`${t('tiket.stamp')} ${localTime(tk.attendedAt)}`} />
        </View>
      ) : null}
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
      </View>
      <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
      {hadir && tk.attendedAt ? <HadirStamp text={`${t('tiket.stamp')} ${localTime(tk.attendedAt)}`} /> : null}
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
          <CreditCard size={14} color="#B45309" />
          <Text className="text-xs font-bold text-amber-800">{t('tiket.pay_now')}</Text>
        </Pressable>
        <Hint tone="amber" text={t('tiket.waiting_verify')} />
      </View>
    );
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

  return (
    <TicketShell
      header={header}
      body={body}
      stub={stub}
      footer={footer}
      onPress={onPress}
      notchColor={notchColor}
      dim={tk.status === 'BATAL'}
    />
  );
}
