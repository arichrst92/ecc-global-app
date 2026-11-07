/**
 * Tinggi keyboard saat ini (0 bila tertutup) — tanpa modul native.
 *
 * Dipakai sebagai ruang bawah daftar hasil pencarian, supaya item yang
 * tertutup keyboard tetap bisa digulir & diketuk. Berguna di Android
 * edge-to-edge, di mana jendela tidak mengecil saat keyboard muncul.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates?.height ?? 0));
    const b = Keyboard.addListener(hideEvt, () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}
