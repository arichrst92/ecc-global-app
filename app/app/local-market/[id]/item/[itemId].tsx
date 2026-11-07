/** Universal link …/local-market/:id/item/:itemId → detail item katalog di app (2.4.7). */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LocalMarketItemLink() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  return <Redirect href={`/market/item/${itemId}?bizId=${id}` as never} />;
}
