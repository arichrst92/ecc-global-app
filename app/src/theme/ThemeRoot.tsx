/**
 * Tema Terang / Gelap Els App — TIDAK mengikuti pengaturan HP; hanya
 * mengikuti pilihan di Profil → Tampilan (tersimpan di preferences).
 *
 * Cara kerja:
 *  - Warna netral, `card`, dan shade tint/teks tiap keluarga warna adalah CSS
 *    variable (tailwind.config.js + theme/palette.js). ThemeRoot memasang nilai
 *    per mode lewat `vars()` NativeWind → semua className ikut berganti.
 *  - Warna hex yang ditulis langsung (ikon, style) memakai `nc('#737373')`, yang
 *    membaca mode aktif saat render.
 *  - Ganti mode → seluruh pohon UI di-mount ulang (key) supaya semua layar,
 *    termasuk yang di-cache navigasi, langsung memakai warna baru.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { vars } from 'nativewind';

import { cssVars, hexMap } from '../../theme/palette';
import { usePreferencesStore } from '@/stores/preferences.store';

export type ThemeMode = 'light' | 'dark';

let currentMode: ThemeMode = 'light';
const HEX_DARK = hexMap();
const STYLES = { light: vars(cssVars('light')), dark: vars(cssVars('dark')) };

/** Mode aktif (dibaca saat render). */
export const isDark = () => currentMode === 'dark';

/**
 * Warna hex tema: di mode gelap, warna netral/tint diganti padanan gelapnya.
 * Warna brand (tombol, aksen) dan putih tidak berubah.
 */
export function nc(hex: string): string {
  if (currentMode !== 'dark') return hex;
  return HEX_DARK[hex.toUpperCase()] ?? hex;
}

/** Gaya ikon status bar untuk layar berlatar terang/netral. */
export const sb = (): 'light' | 'dark' => (currentMode === 'dark' ? 'light' : 'dark');

const ThemeCtx = createContext<ThemeMode>('light');
export const useThemeMode = () => useContext(ThemeCtx);

export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode: ThemeMode = usePreferencesStore((s) => (s.darkMode ? 'dark' : 'light'));
  currentMode = mode;

  // Web: modal/portal dirender di luar pohon → pasang variabel di <html> juga.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.documentElement;
    for (const [k, val] of Object.entries(cssVars(mode))) el.style.setProperty(k, val);
    el.style.backgroundColor = mode === 'dark' ? '#0F0F10' : '#FAFAFA';
  }, [mode]);

  return (
    <ThemeCtx.Provider value={mode}>
      {/* key → mount ulang seluruh UI saat mode berganti */}
      {/* style = vars() saja (bukan array) supaya NativeWind mengenali variabelnya */}
      <View key={mode} className="flex-1" style={STYLES[mode]}>
        {children}
      </View>
    </ThemeCtx.Provider>
  );
}
