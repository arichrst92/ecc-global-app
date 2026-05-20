/**
 * Color scheme hook — saat ini app design hanya support **light theme**.
 * Walaupun device user di dark mode iOS/Android, app tetap render light theme
 * supaya warna brand orange dan kontras tetap konsisten.
 *
 * Dark mode support bisa di-revisit nanti kalau ada permintaan (perlu audit
 * semua warna brand untuk dark mode, tab bar, status bar, dll).
 */
export const useColorScheme = () => {
  return 'light' as const;
};
