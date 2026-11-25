/**
 * Layar tanda tangan (Universal Form, 2.5.1) — goresan jari direkam sebagai
 * titik (PanResponder bawaan RN) dan digambar dengan react-native-svg.
 * Server membentuk PNG dari angka-angka ini (tidak menerima SVG mentah).
 */
import { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { X } from 'lucide-react-native';

import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

export type SignatureResult = { strokes: number[][]; width: number; height: number };

const toPath = (s: number[]) => {
  if (s.length < 2) return '';
  let d = `M${s[0]} ${s[1]}`;
  for (let i = 2; i + 1 < s.length; i += 2) d += ` L${s[i]} ${s[i + 1]}`;
  return d;
};

function strokeLength(strokes: number[][]) {
  let t = 0;
  for (const s of strokes) for (let i = 2; i + 1 < s.length; i += 2) t += Math.hypot(s[i]! - s[i - 2]!, s[i + 1]! - s[i - 1]!);
  return t;
}

export function SignaturePad({
  visible,
  signerName,
  onClose,
  onDone,
  busy,
}: {
  visible: boolean;
  signerName: string;
  onClose: () => void;
  onDone: (r: SignatureResult) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const [strokes, setStrokes] = useState<number[][]>([]);
  const cur = useRef<number[] | null>(null);
  const size = useRef({ w: 300, h: 300 });
  const [, force] = useState(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        cur.current = [Math.round(x), Math.round(y)];
        setStrokes((s) => [...s, cur.current!]);
      },
      onPanResponderMove: (e) => {
        if (!cur.current) return;
        const { locationX: x, locationY: y } = e.nativeEvent;
        const n = cur.current.length;
        // Lewati titik yang terlalu rapat (hemat data).
        if (Math.hypot(x - cur.current[n - 2]!, y - cur.current[n - 1]!) < 2) return;
        cur.current.push(Math.round(x), Math.round(y));
        force((v) => v + 1);
      },
      onPanResponderRelease: () => {
        cur.current = null;
        force((v) => v + 1);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const ok = strokeLength(strokes) >= 40;
  const onLayout = (e: LayoutChangeEvent) => {
    size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView className="flex-1 bg-card" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 py-2 gap-2">
          <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center" hitSlop={8}>
            <X size={20} color={nc('#171717')} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900">{t('uform.sign_title')}</Text>
            <Text className="text-xs text-neutral-500">{t('uform.sign_sub')}</Text>
          </View>
          <Pressable onPress={() => setStrokes([])} hitSlop={8} disabled={!strokes.length}>
            <Text className={`text-sm font-bold ${strokes.length ? 'text-brand-600' : 'text-neutral-300'}`}>{t('uform.sign_redo')}</Text>
          </Pressable>
        </View>
        <View className="flex-1 mx-4 mt-2 rounded-3xl border border-neutral-200 bg-neutral-50 overflow-hidden" onLayout={onLayout} {...pan.panHandlers}>
          <Svg width="100%" height="100%" pointerEvents="none">
            {strokes.map((s, i) => (
              <Path key={i} d={toPath(s)} stroke="#111827" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
          <View pointerEvents="none" className="absolute left-5 right-5 bottom-12 border-t border-neutral-300" />
          <Text pointerEvents="none" className="absolute left-5 bottom-5 text-xs text-neutral-400">
            ✕ {signerName}
          </Text>
        </View>
        <Text className="text-[11px] text-neutral-500 text-center px-6 py-2 leading-4">{t('uform.sign_agree')}</Text>
        <View className="flex-row gap-2 px-4 pb-3">
          <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl border border-neutral-200 items-center">
            <Text className="text-sm font-semibold text-neutral-800">{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={!ok || busy}
            onPress={() => onDone({ strokes, width: Math.round(size.current.w), height: Math.round(size.current.h) })}
            {...gx(`flex-[2] py-3 rounded-xl items-center bg-brand-500 ${!ok || busy ? 'opacity-50' : ''}`)}
          >
            <Text className="text-sm font-bold text-white">{busy ? t('uform.uploading') : t('uform.sign_use')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
