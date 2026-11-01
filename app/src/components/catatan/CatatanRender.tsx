/** Render markdown ringan Catatan saya (lihat utils/catatanMarkdown). */
import { Text, View } from 'react-native';
import { parseBlocks, type Inline } from '@/utils/catatanMarkdown';

function Spans({ inl }: { inl: Inline[] }) {
  return (
    <>
      {inl.map((s, i) => (
        <Text
          key={i}
          className={`${s.bold ? 'font-bold' : ''} ${s.italic ? 'italic' : ''} ${s.mark ? 'bg-amber-200 text-neutral-900' : ''}`}
        >
          {s.text}
        </Text>
      ))}
    </>
  );
}

export function CatatanRender({ text, size = 'base' }: { text: string; size?: 'sm' | 'base' | 'lg' }) {
  const body = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const blocks = parseBlocks(text);
  return (
    <View>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'gap':
            return <View key={i} style={{ height: 10 }} />;
          case 'h':
            return (
              <Text key={i} className="text-lg font-bold text-neutral-900 mt-2 mb-1">
                <Spans inl={b.inl} />
              </Text>
            );
          case 'li':
          case 'ol':
            return (
              <View key={i} className="flex-row mb-1 pl-1">
                <Text className={`${body} text-brand-600 font-bold`} style={{ width: b.type === 'ol' ? 26 : 16 }}>
                  {b.type === 'ol' ? `${b.n}.` : '•'}
                </Text>
                <Text className={`${body} text-neutral-800 leading-relaxed flex-1`}>
                  <Spans inl={b.inl} />
                </Text>
              </View>
            );
          case 'quote':
            return (
              <View key={i} className="border-l-4 border-brand-300 bg-brand-50 rounded-r-lg pl-3 pr-2 py-2 my-1">
                <Text className={`${body} text-neutral-800 italic leading-relaxed`}>
                  <Spans inl={b.inl} />
                </Text>
              </View>
            );
          default:
            return (
              <Text key={i} className={`${body} text-neutral-800 leading-relaxed mb-1`}>
                <Spans inl={b.inl} />
              </Text>
            );
        }
      })}
    </View>
  );
}
