/**
 * Status spinner RefreshControl yang HANYA aktif saat pengguna menarik layar.
 *
 * Jangan pakai `query.isRefetching` / `isFetching` untuk `refreshing`: cache
 * react-query dipersist, jadi saat tab pertama dibuka query langsung
 * refetch di background → iOS menampilkan spinner dan mendorong konten ke
 * bawah walau pengguna tidak menarik apa pun.
 */
import { useCallback, useRef, useState } from 'react';

export function usePullToRefresh(refresh: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const ref = useRef(refresh);
  ref.current = refresh;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ref.current();
    } catch {
      // error ditampilkan oleh state query masing-masing
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}
