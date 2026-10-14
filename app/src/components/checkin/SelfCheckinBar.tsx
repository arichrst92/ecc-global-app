/**
 * Blok self check-in serbaguna (dipakai di detail event):
 *  - sebelum dibuka → hitung mundur "Self check-in akan tersedia dalam hh:mm:ss"
 *  - saat terbuka   → tombol Self Check-in → popup konfirmasi lokasi + pilih keluarga
 *  - selain itu     → tidak tampil
 * Semua perhitungan waktu memakai jam server (lihat utils/serverClock).
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SelfCheckinCountdown } from '@/components/ibadah/SelfCheckinCountdown';
import { SelfCheckinModal } from '@/components/ibadah/SelfCheckinModal';
import type { SelfCheckinMember, SelfCheckinResult } from '@/api/ibadah';
import { ApiError } from '@/types/api';
import { useRouter } from 'expo-router';
import { coordsForSelfCheckin, isRadiusError, SelfCheckinLocationError, showUsherFallback } from '@/utils/selfCheckinLocation';
import { selfCheckinOpenNow, serverNowMs } from '@/utils/serverClock';

export type SelfCheckinData = {
  available: boolean;
  reason: string | null;
  opensAt: string | null;
  closesAt: string | null;
  members: SelfCheckinMember[];
  venue?: { requiresLocation: boolean; radiusM: number | null };
};

export function SelfCheckinBar<T extends SelfCheckinData>({
  queryKey,
  fetcher,
  submit,
  enabled = true,
  question,
  subtitle,
  confirmLabel,
  onCheckedIn,
}: {
  queryKey: readonly unknown[];
  fetcher: () => Promise<T>;
  submit: (jemaatIds: string[], coords: { lat: number; lng: number } | null) => Promise<SelfCheckinResult>;
  enabled?: boolean;
  question?: string;
  subtitle?: (d: T) => string;
  confirmLabel?: string;
  onCheckedIn?: () => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const q = useQuery({ queryKey, queryFn: fetcher, enabled, refetchInterval: 60_000, staleTime: 30_000 });
  const router = useRouter();
  // Self check-in dengan radius → ambil GPS segar dulu; server cek radius.
  const mut = useMutation({
    mutationFn: async (ids: string[]) => submit(ids, await coordsForSelfCheckin(q.data?.venue)),
  });
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const d = q.data;

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isOpen = useMemo(() => selfCheckinOpenNow(d) && (d?.members.length ?? 0) > 0, [d, tick]);

  // Refetch tepat saat jendela ditutup.
  useEffect(() => {
    if (!d?.closesAt || !isOpen) return;
    const ms = Date.parse(d.closesAt) + 1000 - serverNowMs();
    if (ms <= 0 || ms > 6 * 60 * 60 * 1000) return;
    const id = setTimeout(() => {
      setTick((x) => x + 1);
      q.refetch();
    }, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.closesAt, isOpen]);

  if (!d) return null;
  const allDone = d.members.length > 0 && d.members.every((m) => m.status === 'JOIN' || !!m.disabledReason);

  return (
    <View>
      {!isOpen && d.reason === 'TOO_EARLY' && d.opensAt && d.members.length > 0 ? (
        <SelfCheckinCountdown
          opensAt={d.opensAt}
          onDone={() => {
            setTick((x) => x + 1);
            q.refetch();
          }}
        />
      ) : null}
      {isOpen ? (
        <View className="mb-3">
          <Button
            label={allDone ? t('ibadah.self_checkin_done_btn') : t('ibadah.self_checkin_btn')}
            variant={allDone ? 'secondary' : 'primary'}
            onPress={() => setOpen(true)}
            leftIcon={<UserCheck size={16} color={allDone ? '#171717' : '#fff'} />}
            fullWidth
            size="lg"
          />
        </View>
      ) : null}
      <SelfCheckinModal
        visible={open}
        status={d}
        question={question}
        confirmLabel={confirmLabel}
        subtitle={subtitle ? subtitle(d) : undefined}
        loading={mut.isPending}
        onClose={() => setOpen(false)}
        onConfirm={(ids) =>
          mut.mutate(ids, {
            onSuccess: (r) => {
              setOpen(false);
              const ok = r.results.filter((x) => x.result === 'CHECKED_IN').map((x) => x.namaLengkap);
              const failed = r.results.filter((x) => x.result === 'FAILED');
              if (ok.length) showToast(t('ibadah.self_checkin_success', { names: ok.join(', ') }), 'success');
              else if (failed.length) showToast(failed.map((f) => `${f.namaLengkap}: ${f.message ?? ''}`).join('\n'), 'error');
              else showToast(t('ibadah.self_checkin_all_done'), 'info');
              q.refetch();
              onCheckedIn?.();
            },
            onError: (e) => {
              // Di luar radius / lokasi tidak didapat → arahkan ke usher (QR).
              if (e instanceof SelfCheckinLocationError || isRadiusError(e)) {
                setOpen(false);
                showUsherFallback(e.message, () => router.push('/qr-card'));
              } else {
                showToast(e instanceof ApiError ? e.message : t('error.generic'), 'error');
              }
              q.refetch();
            },
          })
        }
      />
    </View>
  );
}
