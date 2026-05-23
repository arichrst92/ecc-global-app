/**
 * Tune-able app config dari BE — admin update via portal Developer Tools →
 * Diagnostics → App Config tab, mobile fetch via /public/app-config.
 *
 * Per BE handoff 2026-05-23 (resolved doc:
 * docs/backend-request-face-confidence-threshold-and-telemetry.md section 7.4).
 */

export type AppConfig = {
  /** Server-side cosine threshold accept/reject face login (0..1).
   *  Production default 0.5. Hardcoded di env, expose untuk visibility/debug. */
  faceMatchThreshold: number;
  /** Mobile-side threshold show "low confidence" toast warning saat face login
   *  success (data.confidence < threshold). Default 0.7. */
  lowConfidenceWarnThreshold: number;
  /** Probability sample telemetry event di mobile (0..1). Default 1.0 (100%
   *  for pilot). Mobile: Math.random() < rate sebelum push event. */
  telemetrySamplingRate: number;
  /** Kalau false, BE drop diagnostics error event tanpa write DB. Tetap
   *  mobile push unconditionally — BE handle. Default true. */
  errorReportingEnabled: boolean;
};

/** Default fallback values — dipakai kalau /public/app-config gagal (network
 *  down saat splash atau BE belum implement endpoint). Mobile tidak akan
 *  blocked — fallback ke conservative defaults. */
export const APP_CONFIG_DEFAULTS: AppConfig = {
  faceMatchThreshold: 0.5,
  lowConfidenceWarnThreshold: 0.7,
  telemetrySamplingRate: 1.0,
  errorReportingEnabled: true,
};
