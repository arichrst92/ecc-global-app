/** Render markdown ringan Catatan saya (lihat utils/catatanMarkdown). */
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { X } from 'lucide-react-native';
import { env } from '@/config/env';
import { parseBlocks, type Inline } from '@/utils/catatanMarkdown';

export const catatanImgSrc = (u: string) => (/^https?:\/\//.test(u) ? u : `${env.apiBaseUrl}${u}`);

/** Gambar di catatan — lebar penuh, tinggi mengikuti rasio asli; ketuk untuk layar penuh. */
export function NoteImage({ url }: { url: string }) {
  const [ratio, setRatio] = useState(4 / 3);
  const [full, setFull] = useState(false);
  const src = catatanImgSrc(url);
  return (
    <>
      <Pressable onPress={() => setFull(true)} className="my-1.5">
        <Image
          source={{ uri: src }}
          onLoad={(e) => {
            const s = (e.nativeEvent as { source?: { width?: number; height?: number } }).source;
            if (s?.width && s?.height) setRatio(s.width / s.height);
          }}
          style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, backgroundColor: '#F5F5F5' }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
      <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)} statusBarTranslucent>
        <Pressable onPress={() => setFull(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' }}>
          <Image source={{ uri: src }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          <View style={{ position: 'absolute', top: 48, right: 20 }}>
            <X size={26} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

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
          case 'img':
            return <NoteImage key={i} url={b.url} />;
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
