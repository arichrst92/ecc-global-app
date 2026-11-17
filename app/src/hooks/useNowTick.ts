/**
 * Jam "sekarang" (jam server bila diketahui) yang diperbarui berkala, supaya
 * tampilan seperti "Sudah selesai" berubah sendiri tanpa refresh.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { serverNowMs } from '@/utils/serverClock';

export function useNowTick(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => serverNowMs());
  useEffect(() => {
    // Di background tidak perlu render ulang; saat app aktif lagi langsung diperbarui.
    const t = setInterval(() => {
      if (AppState.currentState === 'active') setNow(serverNowMs());
    }, intervalMs);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setNow(serverNowMs());
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
