/**
 * Geser untuk check-in — slider "swipe to confirm".
 *
 * Geser sampai ujung (≥ 85% lebar, atau ≥ 50% dengan sentakan cepat) →
 * onConfirm(). Dilepas sebelum itu → kembali ke awal. Sengaja geser (bukan
 * tombol) supaya tidak terpencet saat tiket di-scroll.
 *
 * 2.5.1 — perbaikan "tidak bisa digeser" di sebagian HP:
 *  - Seluruh jalur slider bisa dipegang (dulu hanya kenop ±34 px di tepi kiri,
 *    yang di HP dengan navigasi gestur Android sering tertangkap gestur
 *    "kembali" dari tepi layar / terlalu kecil untuk jari).
 *  - Scroll induk dikunci selama digeser (swipeLock.ts) supaya pager &
 *    ScrollView native Android tidak merebut gerakan.
 *  - Ketuk tanpa geser → kenop bergoyang sebagai petunjuk.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native';
import { CheckCircle2, ChevronsRight, Lock } from 'lucide-react-native';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { setSwipeLocked } from './swipeLock';

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
  const height = size === 'lg' ? 48 : 40;
  const knobSize = height - PAD * 2;
  const x = useRef(new Animated.Value(0)).current;
  const maxX = Math.max(0, width - knobSize - PAD * 2);
  const maxRef = useRef(0);
  maxRef.current = maxX;
  const stateRef = useRef(state);
  stateRef.current = state;
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;
  // Lepas kunci scroll bila komponen hilang di tengah geseran.
  useEffect(() => () => setSwipeLocked(false), []);

  const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
  const hint = () =>
    Animated.sequence([
      Animated.timing(x, { toValue: Math.min(28, maxRef.current), duration: 140, useNativeDriver: false }),
      Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 12 }),
    ]).start();
  const release = () => setSwipeLocked(false);

  const ready = () => stateRef.current === 'READY';
  const pan = useRef(
    PanResponder.create({
      // Klaim sejak sentuhan pertama (termasuk fase capture) → induk tidak sempat merebut.
      onStartShouldSetPanResponder: ready,
      onStartShouldSetPanResponderCapture: ready,
      onMoveShouldSetPanResponder: ready,
      onMoveShouldSetPanResponderCapture: ready,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        setSwipeLocked(true);
        x.stopAnimation();
      },
      onPanResponderMove: (_e, g) => {
        x.setValue(Math.min(Math.max(0, g.dx), maxRef.current));
      },
      onPanResponderRelease: (_e, g) => {
        release();
        const max = maxRef.current;
        const done = max > 0 && (g.dx >= max * 0.85 || (g.dx >= max * 0.5 && g.vx > 0.8));
        if (done) {
          Animated.timing(x, { toValue: max, duration: 120, useNativeDriver: false }).start(() => {
            confirmRef.current();
            // Kembali ke awal; status BUSY/DONE ditangani dari luar.
            setTimeout(reset, 250);
          });
        } else if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          hint(); // ketuk saja → petunjuk "geser"
        } else {
          reset();
        }
      },
      onPanResponderTerminate: () => {
        release();
        reset();
      },
    }),
  ).current;

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
  const fillWidth = Animated.add(x, knobSize + PAD * 2);
  return (
    <View
      onLayout={onLayout}
      {...(locked ? {} : pan.panHandlers)}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      {...gx(
        `rounded-full justify-center overflow-hidden ${locked ? 'bg-neutral-100' : 'bg-brand-500'}`,
        { height },
      )}
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
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: fillWidth,
            backgroundColor: 'rgba(154,52,18,0.28)',
            borderRadius: 999,
          }}
        />
      ) : null}
      <Text
        pointerEvents="none"
        className={`text-center text-xs font-bold ${locked ? 'text-neutral-400' : 'text-white'}`}
        style={{ paddingHorizontal: knobSize + 10 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        pointerEvents="none"
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
          <Lock size={16} color={nc('#A3A3A3')} />
        ) : (
          <ChevronsRight size={20} color="#EA580C" />
        )}
      </Animated.View>
    </View>
  );
}
