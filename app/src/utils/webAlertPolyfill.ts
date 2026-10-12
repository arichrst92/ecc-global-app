/**
 * Polyfill `Alert.alert` untuk web.
 *
 * react-native-web mengimplementasikan `Alert.alert` sebagai no-op, sehingga
 * semua dialog konfirmasi (hapus akun, keluar group, dll) tidak muncul dan
 * tombol terlihat "tidak merespons" di Els App versi web.
 *
 * Di web, map ke dialog bawaan browser:
 *   - 0–1 tombol          → window.alert lalu jalankan onPress tombol itu
 *   - 1 aksi + cancel     → window.confirm (OK = aksi, Batal = cancel)
 *   - ≥2 aksi             → window.prompt berisi pilihan bernomor
 *
 * Native (iOS/Android) TIDAK tersentuh — modul ini no-op di luar web.
 * Di-import sekali di app/_layout.tsx.
 */
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);

    if (actions.length === 1) {
      if (window.confirm(text)) actions[0]!.onPress?.();
      else cancel?.onPress?.();
      return;
    }

    const options = actions.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
    const answer = window.prompt(`${text}\n\n${options}\n\nKetik nomor pilihan:`);
    const picked = actions[Number(answer) - 1];
    if (picked) picked.onPress?.();
    else cancel?.onPress?.();
  };
}

export {};
