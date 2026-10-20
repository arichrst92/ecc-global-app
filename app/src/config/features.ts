/**
 * Feature flag sederhana (butuh build baru untuk mengubah).
 * RESOLUSI: menu Resolusi Tahunan disembunyikan di 2.4.0 — layar & API tetap
 * ada, cukup ubah ke true untuk menampilkan lagi.
 */
export const FEATURES = {
  RESOLUSI: false,
} as const;
