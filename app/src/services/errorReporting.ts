/**
 * Error Reporting service — fire-and-forget event push ke BE.
 *
 * Strategy: tidak pakai third-party (Sentry/GlitchTip/dst) untuk avoid
 * subscription cost + signup friction. Errors push ke endpoint BE
 * `POST /diagnostics/error` (BE handles aggregation, deduplication, dashboard).
 *
 * Architecture aligned dengan telemetry service (src/services/telemetry.ts) —
 * same fire-and-forget pattern. Silent fallback kalau BE belum implement
 * endpoint (404 dropped).
 *
 * Public API (caller side):
 * - initErrorReporting()         — no-op init, kept untuk API compat
 * - reportError(err, context)    — capture exception + breadcrumbs
 * - reportMessage(msg, context)  — capture log message (warning/info)
 * - setReportingUser(user|null)  — set current user context
 * - addBreadcrumb(message, category, data) — append ke ring buffer
 *
 * Endpoint spec proposal: docs/backend-request-diagnostics-error-endpoint.md
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { env } from '@/config/env';

const ENDPOINT_PATH = '/diagnostics/error';
const TIMEOUT_MS = 2000;
const BREADCRUMB_BUFFER_SIZE = 20;

// ============ In-memory state ============

type Breadcrumb = {
  timestamp: string;
  message: string;
  category: string;
  data?: Record<string, unknown>;
};

let currentUser: { noHp?: string } | null = null;
let breadcrumbs: Breadcrumb[] = [];
let initialized = false;

function getRelease(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  return buildNumber ? `${version}+${buildNumber}` : version;
}

function getDeviceMeta() {
  return {
    platform: Platform.OS,
    osVersion:
      typeof Platform.Version === 'string' || typeof Platform.Version === 'number'
        ? String(Platform.Version)
        : undefined,
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    release: getRelease(),
  };
}

// ============ Public API ============

/** Initialize service. No-op — kept untuk API compat saat sebelumnya pakai Sentry. */
export async function initErrorReporting(): Promise<void> {
  if (initialized) return;
  initialized = true;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[errorReporting] initialized — endpoint:', ENDPOINT_PATH);
  }
}

/** Add breadcrumb to ring buffer. Useful untuk track flow yang lead to crash. */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>,
): void {
  try {
    breadcrumbs.push({
      timestamp: new Date().toISOString(),
      message,
      category: category ?? 'app',
      data,
    });
    // Keep last N breadcrumbs only
    if (breadcrumbs.length > BREADCRUMB_BUFFER_SIZE) {
      breadcrumbs = breadcrumbs.slice(-BREADCRUMB_BUFFER_SIZE);
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[breadcrumb]', category ?? 'app', message);
    }
  } catch {
    // Defensive
  }
}

/** Set current user context. Pass null saat logout. */
export function setReportingUser(user: { noHp?: string } | null): void {
  currentUser = user;
}

/** Report exception with context. Fire-and-forget. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[errorReporting] reportError:', err, context);
  }
  sendEvent('error', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    name: err instanceof Error ? err.name : 'UnknownError',
    context,
  });
}

/** Report info/warning message. */
export function reportMessage(msg: string, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[errorReporting] reportMessage:', msg, context);
  }
  sendEvent('message', { message: msg, context });
}

// ============ Internal: HTTP transport ============

type EventPayload = {
  type: 'error' | 'message';
  release: string;
  device: ReturnType<typeof getDeviceMeta>;
  user: { noHp?: string } | null;
  breadcrumbs: Breadcrumb[];
  timestamp: string;
  // From caller
  message: string;
  stack?: string;
  name?: string;
  context?: Record<string, unknown>;
};

function sendEvent(
  type: 'error' | 'message',
  data: Pick<EventPayload, 'message' | 'stack' | 'name' | 'context'>,
): void {
  // Skip di __DEV__ — supaya pilot dashboard tidak polluted dengan dev errors.
  if (__DEV__) return;

  try {
    const payload: EventPayload = {
      type,
      release: getRelease(),
      device: getDeviceMeta(),
      user: currentUser,
      // Snapshot breadcrumbs at time of error
      breadcrumbs: [...breadcrumbs],
      timestamp: new Date().toISOString(),
      ...data,
    };

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    // Floating promise — intentionally not awaited.
    void fetch(`${env.apiBaseUrl}${ENDPOINT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
      .catch(() => {
        // Network error / 404 (BE belum implement) / timeout — silent drop.
        // Error reporting never throws back to caller.
      })
      .finally(() => clearTimeout(timeoutId));
  } catch {
    // Defensive — never throw from error reporting.
  }
}
