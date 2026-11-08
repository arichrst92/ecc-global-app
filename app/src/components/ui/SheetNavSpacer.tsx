/**
 * Ruang bawah lembar (bottom sheet) di dalam Modal untuk Android edge-to-edge
 * (2.4.7). Tanpa ini, tombol paling bawah lembar tertutup bilah navigasi
 * Android (tombol ||| ○ <). Saat keyboard terbuka tidak perlu (KeyboardSafeView
 * sudah memberi ruang setinggi keyboard). iOS tidak terpengaruh.
 */
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

export function SheetNavSpacer() {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  if (Platform.OS !== 'android' || kb > 0 || insets.bottom <= 0) return null;
  return <View style={{ height: insets.bottom }} />;
}
