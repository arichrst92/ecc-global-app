/**
 * Error Reporting service — abstract wrapper untuk crash/error tracking.
 *
 * Default no-op. Aktifkan dengan set `EXPO_PUBLIC_SENTRY_DSN` di env
 * (eas.json build profile atau .env). Mobile akan lazy-import Sentry SDK
 * dan forward semua captureException calls.
 *
 * Tanpa DSN: console.error di __DEV__, silent di production. Zero impact
 * ke flow.
 *
 * Dependencies:
 * - `@sentry/react-native` package — install dengan `npx expo install @sentry/react-native`
 * - Sentry account + project → dapat DSN, set ke EXPO_PUBLIC_SENTRY_DSN
 *
 * Setup steps (post-install) di README.md section "Error Reporting".
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Lazy-loaded Sentry SDK. Kalau package belum installed, import gagal → fallback no-op.
type SentryAPI = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (msg: string, context?: Record<string, unknown>) => void;
  setUser: (user: { id?: string; phone?: string } | null) => void;
  setTag: (key: string, value: string) => void;
  addBreadcrumb: (breadcrumb: { category?: string; message: string; level?: string; data?: Record<string, unknown> }) => void;
};

let sentry: SentryAPI | null = null;
let initialized = false;

function getDsn(): string | undefined {
  // EXPO_PUBLIC_* embedded at bundle time.
  return process.env.EXPO_PUBLIC_SENTRY_DSN;
}

function getRelease(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  // Build number for granular release tracking
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  return buildNumber ? `${version}+${buildNumber}` : version;
}

/**
 * Initialize Sentry. Idempotent (safe to call multiple times).
 * Call once di root layout setelah font loaded.
 *
 * No-op kalau DSN tidak di-set atau package belum installed.
 */
export async function initErrorReporting(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = getDsn();
  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[errorReporting] EXPO_PUBLIC_SENTRY_DSN not set — error reporting disabled');
    }
    return;
  }

  try {
    // Lazy require — supaya kalau package belum install, app ga crash.
    // @ts-expect-error — module optional, ga di package.json sampai user install
    const mod = await import('@sentry/react-native');
    sentry = (mod.default ?? mod) as SentryAPI;
    sentry.init({
      dsn,
      release: getRelease(),
      environment: __DEV__ ? 'development' : 'production',
      // Don't capture transactions (performance monitoring) untuk reduce quota.
      // Enable later kalau perlu.
      tracesSampleRate: 0,
      // Sample 100% of errors di pilot, reduce later.
      sampleRate: 1.0,
      // Hide PII by default — kita explicit set via setUser kalau perlu.
      sendDefaultPii: false,
      // Don't auto-attach screenshots — privacy.
      attachScreenshot: false,
      // Skip dev errors.
      enabled: !__DEV__,
    });

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[errorReporting] Sentry initialized:', getRelease());
    }
  } catch (e) {
    sentry = null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[errorReporting] Failed to load @sentry/react-native — package not installed?\n' +
          'Run: npx expo install @sentry/react-native\n' +
          'Error:',
        e,
      );
    }
  }
}

/** Report exception. Safe to call before init (silent drop). */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[errorReporting] reportError:', err, context);
  }
  try {
    sentry?.captureException(err, context);
  } catch {
    // Defensive — never throw from error reporting.
  }
}

/** Report message (info/warning). */
export function reportMessage(
  msg: string,
  context?: Record<string, unknown>,
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[errorReporting] reportMessage:', msg, context);
  }
  try {
    sentry?.captureMessage(msg, context);
  } catch {
    // Defensive
  }
}

/** Set current user context — call setelah login, clear setelah logout.
 *  Privacy: kirim noHp saja (no email/name) untuk correlate errors per user
 *  di Sentry dashboard. */
export function setReportingUser(user: { noHp?: string } | null): void {
  try {
    if (user?.noHp) {
      sentry?.setUser({ id: user.noHp, phone: user.noHp });
    } else {
      sentry?.setUser(null);
    }
  } catch {
    // Defensive
  }
}

/** Add breadcrumb — context untuk error berikutnya. Useful untuk track user
 *  navigation flow yang lead to crash. */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>,
): void {
  try {
    sentry?.addBreadcrumb({
      message,
      category: category ?? 'app',
      level: 'info',
      data,
    });
  } catch {
    // Defensive
  }
}
