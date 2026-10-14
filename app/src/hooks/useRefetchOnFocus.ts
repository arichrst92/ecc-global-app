/**
 * Refetch data saat layar kembali difokuskan (pindah tab / kembali dari
 * layar lain) dan saat aplikasi kembali aktif dari background. Cache
 * react-query dipersist ke storage, jadi tanpa ini layar bisa menampilkan
 * data lama (mis. ibadah yang baru dibuat hari ini tidak muncul).
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useRefetchOnFocus(refetch: () => unknown, enabled = true) {
  const first = useRef(true);
  const ref = useRef(refetch);
  ref.current = refetch;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      // Fokus pertama sudah ditangani mount query.
      if (first.current) {
        first.current = false;
        return;
      }
      ref.current();
    }, [enabled]),
  );

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') ref.current();
    });
    return () => sub.remove();
  }, [enabled]);
}
