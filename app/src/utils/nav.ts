/**
 * Tombol "kembali" yang selalu berfungsi.
 *
 * Di versi web (elsapp), halaman yang dibuka langsung lewat URL, di-refresh,
 * dibuka dari notifikasi / link share, atau di tab baru TIDAK punya riwayat
 * navigasi — `router.back()` diam saja. `goBack` kembali kalau bisa; kalau
 * tidak, pindah ke halaman induk yang ada (mis. /homecell/abc/schedule/xyz
 * → /homecell/abc), dan terakhir ke Beranda.
 */
import { Platform } from 'react-native';

import { parentRoute } from './navParent';

export { parentRoute };

type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: never) => void;
};

export function goBack(router: BackRouter, fallback?: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  const here = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : '';
  router.replace((fallback ?? (here ? parentRoute(here) : '/')) as never);
}
