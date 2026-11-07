/**
 * TextInput dengan warna placeholder default yang terbaca di mode terang & gelap.
 *
 * RN tidak memberi warna placeholder default yang mengikuti tema app: di Android
 * (dan beberapa iOS) placeholder jadi hitam di atas kolom gelap. Semua layar
 * mengimpor TextInput dari sini (bukan dari 'react-native'); bila layar memberi
 * `placeholderTextColor` sendiri, itu yang dipakai.
 */
import { forwardRef } from 'react';
import { TextInput as RNTextInput, type TextInputProps } from 'react-native';

import { nc } from '@/theme/ThemeRoot';

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function ThemedTextInput(props, ref) {
  return <RNTextInput ref={ref} {...props} placeholderTextColor={props.placeholderTextColor ?? nc('#A3A3A3')} />;
});
// Supaya `useRef<TextInput>(null)` tetap bertipe instance TextInput RN.
export type TextInput = RNTextInput;
