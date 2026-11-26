/**
 * HP lipat (Galaxy Z Fold / Pixel Fold) & layar besar.
 *
 * - Layar dalam Fold lebar ±690 dp (tegak) – ±900 dp (mendatar). Android 16
 *   (targetSdk 36) MENGABAIKAN kunci portrait di layar ≥ 600 dp, jadi app bisa
 *   tampil mendatar di layar dalam.
 * - Buka/tutup lipatan mengubah lebar jendela TANPA membuat ulang layar
 *   (configChanges di plugin with-optional-screen-features).
 */
import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';

/** Jendela lebar (layar dalam Fold / tablet). HP biasa & layar luar Fold = false. */
export const WIDE_MIN = 600;

/**
 * Tinggi gambar besar: di HP biasa tetap rasio asli (`w / ratio`); di layar
 * lebar dibatasi supaya gambar tidak memenuhi / melebihi tinggi layar.
 */
export function useCappedHeight(w: number, ratio: number, maxFrac = 0.55): number {
  const { width, height } = useWindowDimensions();
  const h = w / ratio;
  return width >= WIDE_MIN ? Math.min(h, height * maxFrac) : h;
}

/**
 * Pager / carousel horizontal: lebar halaman berubah saat lipatan dibuka/ditutup
 * atau layar diputar → posisi gulir lama jadi "setengah halaman". Gulir ulang
 * ke halaman yang sedang tampil.
 */
export function useKeepPage(
  ref: { current: unknown },
  step: number,
  index: number,
) {
  const prevStep = useRef(step);
  const idx = useRef(index);
  idx.current = index;
  useEffect(() => {
    if (prevStep.current === step || step <= 0) {
      prevStep.current = step;
      return;
    }
    prevStep.current = step;
    const id = requestAnimationFrame(() => {
      const r = ref.current as
        | { scrollToOffset?: (o: { offset: number; animated: boolean }) => void; scrollTo?: (o: { x: number; animated: boolean }) => void }
        | null;
      const x = Math.max(0, idx.current) * step;
      try {
        if (r?.scrollToOffset) r.scrollToOffset({ offset: x, animated: false });
        else r?.scrollTo?.({ x, animated: false });
      } catch {
        /* daftar sudah dilepas */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [step, ref]);
}
