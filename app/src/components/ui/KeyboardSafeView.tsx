/**
 * Pengganti KeyboardAvoidingView yang juga bekerja di Android edge-to-edge
 * (2.4.7). Di mode edge-to-edge jendela Android tidak mengecil saat keyboard
 * muncul, sehingga KeyboardAvoidingView (behavior undefined / 'height')
 * sering tidak berefek dan input / tombol bawah tertutup keyboard.
 *
 *  - iOS     → KeyboardAvoidingView behavior="padding" (seperti sebelumnya).
 *  - Android → View dengan paddingBottom = tinggi keyboard (tanpa modul native).
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

export function KeyboardSafeView({
  children,
  className,
  style,
  keyboardVerticalOffset,
}: {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}) {
  const kbH = useKeyboardHeight();
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset} className={className} style={style}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return (
    <View className={className} style={[style, { paddingBottom: kbH }]}>
      {children}
    </View>
  );
}
