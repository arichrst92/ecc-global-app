/**
 * Status bar untuk halaman ber-hero (gambar / header oranye di dalam ScrollView).
 *
 * Di atas hero: ikon status bar putih, latar transparan. Begitu digulir, konten
 * tidak lagi "menabrak" jam / sinyal / baterai: muncul latar solid setinggi
 * area aman atas dan ikon status bar kembali mengikuti tema.
 *
 * Pakai:
 *   const hero = useHeroScroll();
 *   <ScrollView onScroll={hero.onScroll} scrollEventThrottle={16}>…</ScrollView>
 *   <HeroStatusBar scrolled={hero.scrolled} />   // anak terakhir root View
 */
import { useCallback, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDark, sb } from '@/theme/ThemeRoot';

export function useHeroScroll(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  const last = useRef(false);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const v = e.nativeEvent.contentOffset.y > threshold;
      if (v !== last.current) {
        last.current = v;
        setScrolled(v);
      }
    },
    [threshold],
  );
  return { scrolled, onScroll };
}

export function HeroStatusBar({ scrolled }: { scrolled: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style={scrolled ? sb() : 'light'} />
      {scrolled ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: isDark() ? '#1C1C1E' : '#FFFFFF',
            borderBottomWidth: 0.5,
            borderBottomColor: isDark() ? '#2C2C2E' : '#EEEEEE',
          }}
        />
      ) : null}
    </>
  );
}
