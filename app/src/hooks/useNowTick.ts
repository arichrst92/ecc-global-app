/**
 * Jam "sekarang" (jam server bila diketahui) yang diperbarui berkala, supaya
 * tampilan seperti "Sudah selesai" berubah sendiri tanpa refresh.
 */
import { useEffect, useState } from 'react';
import { serverNowMs } from '@/utils/serverClock';

export function useNowTick(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => serverNowMs());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNowMs()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
