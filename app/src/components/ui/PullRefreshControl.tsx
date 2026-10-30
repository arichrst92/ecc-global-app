/**
 * RefreshControl yang spinner-nya HANYA aktif saat pengguna menarik layar.
 *
 * Jangan isi `refreshing` dengan `query.isRefetching` / `isFetching`: cache
 * react-query dipersist, jadi saat layar dibuka query langsung refetch di
 * background (atau polling) → iOS menampilkan spinner & mendorong konten ke
 * bawah walau pengguna tidak menarik apa pun.
 *
 * Pemakaian: `refreshControl={<PullRefreshControl onRefresh={() => q.refetch()} />}`.
 * `onRefresh` sebaiknya mengembalikan Promise supaya spinner berhenti tepat
 * saat data selesai diambil. Props lain (style, children dari ScrollView
 * Android) diteruskan apa adanya ke RefreshControl.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

type Props = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  onRefresh: () => unknown;
};

export function PullRefreshControl({ onRefresh, ...rest }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const ref = useRef(onRefresh);
  ref.current = onRefresh;

  const handle = useCallback(async () => {
    setRefreshing(true);
    try {
      await ref.current();
    } catch {
      // error ditampilkan oleh state query masing-masing
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  return (
    <RefreshControl
      tintColor="#F97316"
      colors={['#F97316']}
      {...rest}
      refreshing={refreshing}
      onRefresh={handle}
    />
  );
}
