/** Universal link https://eccchurch.global/local-market/:id → layar bisnis di app (2.4.7). */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LocalMarketLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/market/${id}` as never} />;
}
