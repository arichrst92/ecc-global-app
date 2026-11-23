/**
 * Tune-able app config dari BE — admin update via portal Developer Tools →
 * Diagnostics → App Config tab, mobile fetch via /public/app-config.
 *
 * Per BE handoff 2026-05-23. Face-related fields removed 2026-05-26 (M33)
 * tapi BE retain di response sampai 90-day cleanup window — mobile types
 * mark optional supaya extra fields tidak break parsing.
 */

export type AppConfig = {
  /** Probability sample telemetry event di mobile (0..1). Default 1.0 (100%
   *  for pilot). General telemetry — retained meskipun face telemetry sudah
   *  dropped. */
  telemetrySamplingRate: number;
  /** Kalau false, BE drop diagnostics error event tanpa write DB. Tetap
   *  mobile push unconditionally — BE handle. Default true. */
  errorReportingEnabled: boolean;
  /** Server ≥ 2026-11: angka aturan yang dulu tertanam di app (lihat config/appRules). */
  rules?: Partial<import('@/config/appRules').AppRules>;
  /** Server ≥ 2026-11: teks i18n pengganti per bahasa (Portal → App Config → Teks app). */
  texts?: import('@/config/appRules').AppTexts;
  /** Server ≥ 2026-11: tautan dokumen (User Manual per bahasa). */
  links?: import('@/config/appRules').AppLinks;
};

/** Default fallback values — dipakai kalau /public/app-config gagal (network
 *  down saat splash atau BE belum implement endpoint). Mobile tidak akan
 *  blocked — fallback ke conservative defaults. */
export const APP_CONFIG_DEFAULTS: AppConfig = {
  telemetrySamplingRate: 1.0,
  errorReportingEnabled: true,
};
