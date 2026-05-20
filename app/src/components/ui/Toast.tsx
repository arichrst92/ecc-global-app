import { create } from 'zustand';
import { useEffect } from 'react';
import { Animated, Text, View } from 'react-native';
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

const typeStyles: Record<ToastType, string> = {
  info: 'bg-neutral-900',
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  warning: 'bg-amber-600',
};

/**
 * Render Toast container — letakkan di root layout.
 * Pakai useToast.getState().show(msg) dari mana saja untuk display.
 */
export function ToastContainer() {
  const { message, type } = useToast();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity }}
      className="absolute bottom-24 left-0 right-0 items-center px-5 z-50"
    >
      <View className={`${typeStyles[type]} rounded-xl px-4 py-3 max-w-md`}>
        <Text className="text-white text-sm font-medium text-center">{message}</Text>
      </View>
    </Animated.View>
  );
}
