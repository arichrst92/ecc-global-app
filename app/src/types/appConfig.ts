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
};

/** Default fallback values — dipakai kalau /public/app-config gagal (network
 *  down saat splash atau BE belum implement endpoint). Mobile tidak akan
 *  blocked — fallback ke conservative defaults. */
export const APP_CONFIG_DEFAULTS: AppConfig = {
  telemetrySamplingRate: 1.0,
  errorReportingEnabled: true,
};
