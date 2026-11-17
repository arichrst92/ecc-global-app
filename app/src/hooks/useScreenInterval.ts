/**
 * Interval polling yang hanya berjalan saat layar ini sedang dilihat.
 * Layar di belakang tumpukan / tab lain tetap ter-mount di expo-router, jadi
 * tanpa ini `refetchInterval` terus memanggil API walau layarnya tidak terlihat.
 * (Saat app di background, polling dihentikan global lewat focusManager di _layout.)
 */
import { useIsFocused } from '@react-navigation/native';

export function useScreenInterval(ms: number | false): number | false {
  const focused = useIsFocused();
  return focused ? ms : false;
}
