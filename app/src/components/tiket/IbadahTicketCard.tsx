/**
 * Tiket ibadah (satu reservasi = satu orang). Bentuk sama dengan tiket event;
 * ibadah tidak punya hero image → pita warna (umum oranye, anak merah muda).
 *  - Ibadah umum: geser check-in (jendela 15 menit sebelum mulai s.d. selesai)
 *    + batalkan reservasi selama boleh.
 *  - Ibadah anak: check-in di meja CKids; setelah hadir tampil kode jemput.
 */
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Baby, CalendarDays, Church, LogOut, MapPin } from 'lucide-react-native';

import type { MyReservasi } from '@/types/ibadah';
import { cancelMyReservasi } from '@/api/me';
import { useToast } from '@/components/ui/Toast';
import { PickupCodeCard } from '@/components/scanner/PickupCodeCard';
import { formatDateWithDay } from '@/utils/date';
import { localTime, zoneTimeText } from '@/utils/time';
import { formatRadius } from '@/utils/selfCheckinLocation';
import { TicketShell } from './TicketShell';
import { SwipeToCheckin } from './SwipeToCheckin';
import { HadirStamp, Hint, InfoCell, InfoLine, InlineError, RelasiBadge, StatusPill, TicketQR } from './parts';
import { useOpensLabel, useTicketCheckin, useTicketWindow } from './useTicketCheckin';
import { nc } from '@/theme/ThemeRoot';

function statusOf(r: MyReservasi): { key: string; tone: 'green' | 'solidGreen' | 'blue' | 'red' } {
  if (r.status === 'CANCEL') return { key: 'st_BATAL', tone: 'red' };
  if (r.checkedOutAt) return { key: 'st_CHECKOUT', tone: 'green' };
  if (r.status === 'JOIN') return { key: 'st_HADIR', tone: 'solidGreen' };
  return { key: 'st_DAFTAR', tone: 'blue' };
}

/** Jam ibadah dalam zona cabang + labelnya, mis. "10.00 - 12.00 Waktu Kuala Lumpur". */
export function ibadahTimeText(r: MyReservasi, lang?: string): string {
  return zoneTimeText(r.ibadah.jamMulai, r.ibadah.jamSelesai, r.ibadah.timezone, lang);
}

export function IbadahTicketCard({
  reservasi: r,
  variant = 'list',
  onPress,
  notchColor,
}: {
  reservasi: MyReservasi;
  variant?: 'list' | 'full';
  onPress?: () => void;
  notchColor?: string;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const full = variant === 'full';
  const kids = !!r.ibadah.isKidsIbadah || r.selfCheckin?.mode === 'DESK';
  const st = statusOf(r);
  const hadir = r.status === 'JOIN';
  const win = useTicketWindow(r.selfCheckin?.opensAt, r.selfCheckin?.closesAt);
  const opensLabel = useOpensLabel(r.selfCheckin?.opensAt);
  const ck = useTicketCheckin({
    kind: 'ibadah',
    targetId: r.ibadah.id,
    jemaatId: r.jemaat.id,
    namaLengkap: r.jemaat.namaLengkap,
    venue: r.selfCheckin?.venue,
  });

  const cancel = useMutation({
    mutationFn: () => cancelMyReservasi(r.id),
    onSuccess: () => {
      showToast(t('reservasi.cancelled'), 'success');
      void qc.invalidateQueries({ queryKey: ['my-reservasi'] });
      void qc.invalidateQueries({ queryKey: ['reservasi-options'] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : t('error.generic'), 'error'),
  });
  const askCancel = () =>
    Alert.alert(t('reservasi.cancel_title'), t('reservasi.cancel_body', { name: r.jemaat.namaLengkap }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('reservasi.cancel_confirm'), style: 'destructive', onPress: () => cancel.mutate() },
    ]);

  const band = kids ? '#DB2777' : '#EA580C';
  const sub = [r.ibadah.kategoriIbadah?.nama, r.ibadah.cabang?.nama].filter(Boolean).join(' · ');
  const header = (
    <View style={{ backgroundColor: band }} className={`flex-row items-center gap-2.5 px-3.5 ${full ? 'py-5' : 'py-3'}`}>
      {kids ? <Baby size={full ? 28 : 22} color="#fff" /> : <Church size={full ? 28 : 22} color="#fff" />}
      <View className="flex-1 min-w-0">
        <Text className={`text-white font-bold ${full ? 'text-lg' : 'text-sm'}`} numberOfLines={1}>
          {r.ibadah.nama}
        </Text>
        {sub ? <Text className="text-white/90 text-[11px]">{sub}</Text> : null}
      </View>
    </View>
  );

  const body = full ? (
    <View className="flex-row flex-wrap">
      <InfoCell label={t('tiket.date')} value={formatDateWithDay(r.tanggalIbadah, i18n.language)} />
      <InfoCell label={t('tiket.time')} value={ibadahTimeText(r, i18n.language)} />
      <InfoCell label={t('tiket.location')} value={r.ibadah.lokasi || r.ibadah.cabang?.nama || '-'} />
    </View>
  ) : (
    <View>
      <InfoLine icon={<CalendarDays size={11} color={nc('#737373')} />}>
        {formatDateWithDay(r.tanggalIbadah, i18n.language)} · {ibadahTimeText(r, i18n.language)}
      </InfoLine>
      {r.ibadah.lokasi ? <InfoLine icon={<MapPin size={11} color={nc('#737373')} />}>{r.ibadah.lokasi}</InfoLine> : null}
    </View>
  );

  const relasi =
    r.relation && r.relation !== 'SELF' ? (
      <RelasiBadge label={t(`my_reservasi.rel_${r.relation}`)} tamu={r.relation === 'TAMU'} />
    ) : null;
  const stampText = hadir && r.joinedAt ? `${t('tiket.stamp')} ${localTime(r.joinedAt)}` : null;

  const stub = full ? (
    <View className="items-center">
      <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.on_behalf')}</Text>
      <View className="flex-row items-center gap-1.5 mb-3">
        <Text className="text-base font-bold text-neutral-900">{r.jemaat.namaLengkap}</Text>
        {relasi}
      </View>
      <TicketQR value={r.jemaat.kode} size={190} />
      <Text className="mt-2 text-base font-bold tracking-[4px] text-neutral-900">{r.jemaat.kode ?? '—'}</Text>
      <View className="mt-2">
        <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
      </View>
      {stampText ? (
        <View style={{ position: 'absolute', right: 0, top: 4 }}>
          <HadirStamp text={stampText} />
        </View>
      ) : null}
    </View>
  ) : (
    <View className="flex-row items-center gap-2.5">
      <TicketQR value={r.jemaat.kode} size={46} />
      <View className="flex-1 min-w-0">
        <Text className="text-[9px] text-neutral-400 tracking-wider">{t('tiket.on_behalf')}</Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-neutral-900 flex-shrink" numberOfLines={1}>
            {r.jemaat.namaLengkap}
          </Text>
          {relasi}
        </View>
        <Text className="text-[10px] text-neutral-500 tracking-widest">{r.jemaat.kode ?? ''}</Text>
      </View>
      <StatusPill label={t(`tiket.${st.key}`)} tone={st.tone} />
      {stampText ? <HadirStamp text={stampText} /> : null}
    </View>
  );

  // ---- bagian bawah
  let footer: React.ReactNode = null;
  if (r.status === 'CANCEL') {
    footer = null;
  } else if (kids) {
    if (hadir && r.pickupCode && !r.pickedUpAt) {
      footer = full ? (
        <PickupCodeCard pickupCode={r.pickupCode} anakNama={r.jemaat.namaLengkap} ibadahNama={r.ibadah.nama} />
      ) : (
        <View className="bg-brand-50 border-2 border-brand-200 rounded-xl py-2 items-center">
          <Text className="text-[9px] font-bold text-brand-700 tracking-wider">{t('kids.pickup_code_title').toUpperCase()}</Text>
          <Text className="text-2xl font-bold text-brand-600" style={{ letterSpacing: 6 }}>
            {r.pickupCode}
          </Text>
        </View>
      );
    } else if (r.pickedUpAt) {
      footer = <SwipeToCheckin state="DONE" label={t('tiket.pickup_done', { time: localTime(r.pickedUpAt) })} onConfirm={() => {}} />;
    } else if (!hadir) {
      footer = <Hint text={t('tiket.desk_kids')} />;
    }
  } else if (hadir) {
    const needCheckout = r.ibadah.requiresCheckout && !r.checkedOutAt;
    footer = (
      <View>
        <SwipeToCheckin state="DONE" label={t('tiket.done', { time: localTime(r.joinedAt) })} onConfirm={() => {}} />
        {needCheckout ? (
          <View className="flex-row items-center gap-1 mt-1.5">
            <LogOut size={11} color={nc('#B45309')} />
            <Text className="text-[11px] text-amber-700">{t('my_reservasi.checkout_needed')}</Text>
          </View>
        ) : null}
      </View>
    );
  } else if (win !== 'CLOSED' || r.canCancel) {
    footer = (
      <View>
        {win !== 'CLOSED' ? (
          <>
            <SwipeToCheckin
              size={full ? 'lg' : 'md'}
              state={win === 'LOCKED' ? 'LOCKED' : ck.busy ? 'BUSY' : 'READY'}
              label={win === 'LOCKED' ? opensLabel : t('tiket.swipe')}
              onConfirm={ck.checkin}
            />
            {win === 'OPEN' && r.selfCheckin?.venue?.requiresLocation && !ck.error ? (
              <Hint text={t('tiket.radius_note', { radius: formatRadius(r.selfCheckin.venue.radiusM ?? 0) })} />
            ) : null}
            <InlineError text={ck.error} />
          </>
        ) : null}
        {r.canCancel ? (
          <Pressable
            onPress={askCancel}
            disabled={cancel.isPending}
            className="self-center mt-2.5 px-3 py-1 rounded-full border border-red-200"
          >
            <Text className="text-[11px] font-semibold text-red-600">{cancel.isPending ? '…' : t('reservasi.cancel_btn')}</Text>
          </Pressable>
        ) : null}
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
      dim={r.status === 'CANCEL'}
    />
  );
}
