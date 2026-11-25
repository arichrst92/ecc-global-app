import { create } from 'zustand';
import { gx } from '@/theme/gradient';
import { useEffect } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

type ToastState = {
  message: string | null;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
};

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 3000);
  },
  hide: () => set({ message: null }),
}));

/**
 * Modal yang sedang terbuka (paling atas = terakhir). Modal RN tampil di jendela
 * native terpisah DI ATAS root — toast di root tertutup. Karena itu toast juga
 * dirender di dalam modal teratas, dan toast root disembunyikan selama ada modal.
 */
type ModalStack = { ids: number[]; push: (id: number) => void; pop: (id: number) => void };
export const useModalStack = create<ModalStack>((set) => ({
  ids: [],
  push: (id) => set((s) => ({ ids: [...s.ids.filter((x) => x !== id), id] })),
  pop: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}));

const typeStyles: Record<ToastType, string> = {
  info: 'bg-[#262626]',
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  warning: 'bg-amber-600',
};

/**
 * Render Toast container — letakkan di root layout.
 * Pakai useToast.getState().show(msg) dari mana saja untuk display.
 */
export function ToastContainer({ modalId }: { modalId?: number } = {}) {
  const { message, type } = useToast();
  // Root: sembunyi bila ada modal terbuka. Di modal: hanya modal teratas yang menampilkan.
  const top = useModalStack((s) => s.ids[s.ids.length - 1]);
  const visibleHere = modalId === undefined ? top === undefined : top === modalId;
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      // Web tidak punya native animated module → pakai JS (tanpa warning).
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [message, opacity]);

  if (!message || !visibleHere) return null;

  return (
    <Animated.View
      pointerEvents="none"
      // Di atas tab bar + navigation bar (edge-to-edge) di semua device
      style={{ opacity, bottom: insets.bottom + 80 }}
      className="absolute left-0 right-0 items-center px-5 z-50"
    >
      <View {...gx(`${typeStyles[type]} rounded-xl px-4 py-3 max-w-md`)}>
        <Text className="text-white text-sm font-medium text-center">{message}</Text>
      </View>
    </Animated.View>
  );
}
