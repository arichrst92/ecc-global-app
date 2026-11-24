/**
 * Ikon Scanner di header Home (kiri ikon QR) — hanya untuk petugas scanner
 * ibadah/event. Sebelumnya tile di Quick Access.
 *
 * Petugas bisa diberi akses scan mendadak (Portal / koordinator di app). Dulu
 * ikon baru muncul setelah app ditutup & dibuka ulang (data ditahan 5 menit,
 * tanpa refetch). Sekarang: cek ulang tiap 60 detik selama Beranda terlihat,
 * saat Beranda difokuskan / app kembali aktif, saat tarik-untuk-refresh, dan
 * segera saat ada notifikasi baru (mis. "Anda dijadwalkan melayani").
 */
import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScanLine } from 'lucide-react-native';

import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';
import { useScreenInterval } from '@/hooks/useScreenInterval';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useNotificationBadge } from '@/hooks/useNotifications';

export function ScannerHeaderButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const pollMs = useScreenInterval(60_000);
  const ev = useScannerEvents({ pollMs });
  const ib = useScannerIbadah({ pollMs });
  const recheck = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['scanner', 'events'], exact: true }),
      qc.invalidateQueries({ queryKey: ['scanner', 'ibadah'], exact: true }),
    ]);
  useRefetchOnFocus(recheck);
  // Notifikasi baru (badge naik) → cek ulang akses scan saat itu juga.
  const unread = useNotificationBadge().data?.count;
  const prevUnread = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (unread != null && prevUnread.current != null && unread > prevUnread.current) void recheck();
    prevUnread.current = unread;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);
  const authorized = (ev.data?.length ?? 0) > 0 || (ib.data?.length ?? 0) > 0;
  if (!authorized) return null;
  return (
    <Pressable
      onPress={() => router.push('/scanner')}
      className="bg-white/15 rounded-full p-2"
      accessibilityLabel={t('quickaccess.scanner')}
    >
      <ScanLine size={20} color="#fff" />
    </Pressable>
  );
}
