/**
 * Web: tangani "chunk lama hilang" setelah deploy baru.
 *
 * Bundle web dipecah per modul ber-hash (mis. bimk-<hash>.js untuk Alkitab).
 * Kalau tab browser masih memakai entry versi lama lalu server sudah berisi
 * build baru, chunk lama 404 → AsyncRequireError "Loading module … failed".
 * Solusi: muat ulang halaman SEKALI supaya browser mengambil index.html +
 * entry terbaru. Penanda di sessionStorage mencegah reload berulang.
 */
import { Platform } from 'react-native';

const KEY = 'els.chunk-reload-at';

export function isChunkLoadError(e: unknown): boolean {
  const err = e as { name?: string; message?: string } | null | undefined;
  const text = `${err?.name ?? ''} ${err?.message ?? String(e ?? '')}`;
  return /AsyncRequireError|Loading module .* failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(text);
}

/** Reload sekali (maks. 1x per 60 detik). Return true kalau reload dijalankan. */
export function reloadForNewVersion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage diblokir — tetap reload sekali.
  }
  window.location.reload();
  return true;
}

/** Pasang listener global (web). */
export function installChunkReloadHandler(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkLoadError((e as PromiseRejectionEvent).reason) && reloadForNewVersion()) e.preventDefault();
  });
  window.addEventListener('error', (e) => {
    if (isChunkLoadError((e as ErrorEvent).error ?? (e as ErrorEvent).message)) reloadForNewVersion();
  });
}
