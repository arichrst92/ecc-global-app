/**
 * Buka halaman persembahan (giving) web per cabang dari app.
 *
 * - iOS: Safari (Linking) — donasi wajib di luar app (Apple Guideline 3.2.2(iv)).
 *   Safari menampilkan "◀ Els App" di pojok kiri atas, dan halaman web punya
 *   tombol "Kembali ke Els App" (ecc://giving-done).
 * - Android: Chrome Custom Tab (in-app browser) dengan tombol tutup (X) +
 *   tombol "Kembali ke Els App" di halaman.
 * - Web (elsapp): tab yang sama dengan ?return= → tombol kembali ke halaman ini.
 *
 * `from=app` membuat landing menampilkan bar "Kembali ke Els App".
 */
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export function buildGivingUrl(cabangKode?: string | null, returnUrl?: string | null): string {
  const kode = cabangKode?.trim();
  const base = kode
    ? `https://eccchurch.global/persembahan/${encodeURIComponent(kode)}`
    : 'https://eccchurch.global/persembahan';
  const params = ['from=app'];
  if (returnUrl) params.push(`return=${encodeURIComponent(returnUrl)}`);
  return `${base}?${params.join('&')}`;
}

export async function openGiving(cabangKode?: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.assign(buildGivingUrl(cabangKode, window.location.href));
    return;
  }
  const url = buildGivingUrl(cabangKode);
  if (Platform.OS === 'android') {
    try {
      await WebBrowser.openBrowserAsync(url, { toolbarColor: '#F97316', showTitle: true, enableBarCollapsing: false });
      return;
    } catch {
      // Custom Tab tidak tersedia → browser biasa
    }
  }
  await Linking.openURL(url).catch(() => {});
}
