/**
 * Logika check-in per tiket (ibadah & event):
 *  - status jendela waktu (pakai jam server, bukan jam HP)
 *  - geser → ambil lokasi kalau perlu → POST self check-in untuk SATU orang
 *  - gagal radius / lokasi → pesan inline (QR tetap bisa ditunjukkan ke usher)
 */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { postSelfCheckin } from '@/api/ibadah';
import { postEventSelfCheckin } from '@/api/event';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/types/api';
import { coordsForSelfCheckin, SelfCheckinLocationError } from '@/utils/selfCheckinLocation';
import { serverNowMs } from '@/utils/serverClock';
import { formatInstantDate, localTime } from '@/utils/time';

export type TicketWindow = 'LOCKED' | 'OPEN' | 'CLOSED';

/** Status jendela check-in, dihitung ulang tiap 15 detik dengan jam server. */
export function useTicketWindow(opensAt: string | null | undefined, closesAt: string | null | undefined): TicketWindow {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!opensAt || !closesAt) return 'CLOSED';
  const now = serverNowMs();
  if (now < Date.parse(opensAt)) return 'LOCKED';
  if (now > Date.parse(closesAt)) return 'CLOSED';
  return 'OPEN';
}

/** "Check-in dibuka 07:45" (hari ini) atau "Check-in dibuka Min, 1 Nov, 07:45". */
export function useOpensLabel(opensAt: string | null | undefined): string {
  const { t, i18n } = useTranslation();
  if (!opensAt) return '';
  const d = new Date(opensAt);
  const today = new Date(serverNowMs());
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? t('tiket.opens_at', { time: localTime(opensAt) })
    : t('tiket.opens_on', { date: formatInstantDate(opensAt, i18n.language), time: localTime(opensAt) });
}

export function useTicketCheckin(opts: {
  kind: 'ibadah' | 'event';
  /** ibadahId atau eventId */
  targetId: string;
  jemaatId: string;
  namaLengkap: string;
  venue?: { requiresLocation: boolean; radiusM: number | null };
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      setError(null);
      const coords = await coordsForSelfCheckin(opts.venue);
      return opts.kind === 'ibadah'
        ? postSelfCheckin(opts.targetId, [opts.jemaatId], coords)
        : postEventSelfCheckin(opts.targetId, [opts.jemaatId], coords);
    },
    onSuccess: (r) => {
      const res = r.results.find((x) => x.jemaatId === opts.jemaatId) ?? r.results[0];
      if (res?.result === 'FAILED') {
        setError(res.message ?? t('error.generic'));
        return;
      }
      showToast(t('tiket.success_toast', { name: opts.namaLengkap }), 'success');
      void qc.invalidateQueries({ queryKey: ['my-reservasi'] });
      void qc.invalidateQueries({ queryKey: ['event-tiket'] });
      void qc.invalidateQueries({ queryKey: ['event'] });
      void qc.invalidateQueries({ queryKey: ['ibadah'] });
    },
    onError: (e) => {
      if (e instanceof SelfCheckinLocationError) setError(e.message);
      else if (e instanceof ApiError) setError(e.message);
      else setError(t('error.generic'));
    },
  });

  return { checkin: () => mut.mutate(), busy: mut.isPending, error };
}
