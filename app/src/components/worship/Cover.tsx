import { Image, View } from 'react-native';
import { Disc3 } from 'lucide-react-native';

/** Cover album persegi dengan fallback ikon. */
export function Cover({ url, size, radius = 10 }: { url: string | null | undefined; size: number; radius?: number }) {
  if (!url) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius }} className="bg-brand-100 items-center justify-center">
        <Disc3 size={Math.max(16, size * 0.4)} color="#EA580C" />
      </View>
    );
  }
  return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#FFEDD5' }} />;
}
