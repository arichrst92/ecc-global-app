/**
 * Geser untuk check-in — slider "swipe to confirm".
 *
 * Geser kenop sampai ujung (≥ 85% lebar) → onConfirm(). Dilepas sebelum itu →
 * kembali ke awal. Sengaja geser (bukan tombol) supaya tidak terpencet saat
 * tiket di-scroll. Kenop "mengklaim" gesture horizontal, jadi aman dipakai di
 * dalam pager horizontal (tampilan penuh tiket).
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native';
import { CheckCircle2, ChevronsRight, Lock } from 'lucide-react-native';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

const KNOB = 34;
const PAD = 3;

export type SwipeState = 'LOCKED' | 'READY' | 'BUSY' | 'DONE';

export function SwipeToCheckin({
  state,
  label,
  onConfirm,
  size = 'md',
}: {
  state: SwipeState;
  /** Teks di tengah slider (mis. "Geser untuk check-in", "Check-in dibuka 07:45"). */
  label: string;
  onConfirm: () => void;
  size?: 'md' | 'lg';
}) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const maxX = Math.max(0, width - KNOB - PAD * 2);
  const maxRef = useRef(0);
  maxRef.current = maxX;
  const stateRef = useRef(state);
  stateRef.current = state;
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => stateRef.current === 'READY',
      onStartShouldSetPanResponderCapture: () => stateRef.current === 'READY',
      onMoveShouldSetPanResponder: () => stateRef.current === 'READY',
      onMoveShouldSetPanResponderCapture: () => stateRef.current === 'READY',
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        x.setValue(Math.min(Math.max(0, g.dx), maxRef.current));
      },
      onPanResponderRelease: (_e, g) => {
        if (maxRef.current > 0 && g.dx >= maxRef.current * 0.85) {
          Animated.timing(x, { toValue: maxRef.current, duration: 120, useNativeDriver: false }).start(() => {
            confirmRef.current();
            // Kembali ke awal; status BUSY/DONE ditangani dari luar.
            setTimeout(reset, 250);
          });
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    }),
  ).current;

  const height = size === 'lg' ? 48 : 40;
  const knobSize = height - PAD * 2;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (state === 'DONE') {
    return (
      <View
        className="rounded-full bg-emerald-600 flex-row items-center justify-center gap-1.5"
        style={{ height }}
        accessibilityRole="text"
      >
        <CheckCircle2 size={16} color="#fff" />
        <Text className="text-white text-xs font-bold">{label}</Text>
      </View>
    );
  }

  const locked = state === 'LOCKED';
  const fillWidth = Animated.add(x, new Animated.Value(knobSize + PAD * 2));
  return (
    <View
      onLayout={onLayout}
      {...gx(`rounded-full justify-center overflow-hidden ${locked ? 'bg-neutral-100' : 'bg-brand-500'}`, { height })}
      
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityActions={state === 'READY' ? [{ name: 'activate', label }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && state === 'READY') onConfirm();
      }}
    >
      {!locked ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fillWidth, backgroundColor: 'rgba(154,52,18,0.28)', borderRadius: 999 }}
        />
      ) : null}
      <Text
        className={`text-center text-xs font-bold ${locked ? 'text-neutral-400' : 'text-white'}`}
        style={{ paddingHorizontal: knobSize + 10 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        {...(locked ? {} : pan.panHandlers)}
        style={{
          position: 'absolute',
          left: PAD,
          top: PAD,
          width: knobSize,
          height: knobSize,
          borderRadius: knobSize / 2,
          backgroundColor: locked ? nc('#E5E5E5') : '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: x }],
        }}
      >
        {state === 'BUSY' ? (
          <ActivityIndicator size="small" color="#EA580C" />
        ) : locked ? (
          <Lock size={15} color={nc('#A3A3A3')} />
        ) : (
          <ChevronsRight size={18} color="#EA580C" />
        )}
      </Animated.View>
    </View>
  );
}
