/**
 * Feature flag sederhana (butuh build baru untuk mengubah).
 * RESOLUSI: sejak 2.4.x Resolusi Tahunan diakses dari ikon di header Profil
 * (sebelah Kalender), tidak lagi dari Beranda / menu Profil. Flag ini saat
 * ini tidak dipakai; dibiarkan untuk kebutuhan feature flag berikutnya.
 */
export const FEATURES = {
  RESOLUSI: true,
} as const;
