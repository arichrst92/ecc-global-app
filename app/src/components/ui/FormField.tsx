/** Label + input sederhana untuk form edit (tema terang/gelap). */
import type { ComponentProps, ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';
import { nc } from '@/theme/ThemeRoot';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{label}</Text>
      {children}
      {hint ? <Text className="text-[11px] text-neutral-400 mt-1.5">{hint}</Text> : null}
    </View>
  );
}

export function Input({
  center,
  multiline,
  ...p
}: ComponentProps<typeof TextInput> & { center?: boolean }) {
  return (
    <TextInput
      {...p}
      multiline={multiline}
      placeholderTextColor={nc('#A3A3A3')}
      className={`bg-card border border-neutral-200 rounded-xl px-3 py-2.5 text-base text-neutral-900 ${center ? 'text-center' : ''}`}
      style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
    />
  );
}
