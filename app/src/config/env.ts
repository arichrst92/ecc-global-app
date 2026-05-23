import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  apiBaseUrl?: string;
  apiBaseUrlDev?: string;
  apiPortDev?: number;
  apiKey?: string;
  env?: 'development' | 'staging' | 'production';
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const isDev = __DEV__;

/**
 * Resolve API base URL.
 *
 * Priority order (per BE production launch brief 2026-05-23):
 * 1. `process.env.EXPO_PUBLIC_API_BASE_URL` — recommended pattern, set via
 *    `.env*` file atau EAS build profile (`eas.json`). Build-time embedded.
 * 2. `extra.apiBaseUrl` dari `app.json` (legacy fallback).
 * 3. Auto-detect dev IP via Metro hostUri.
 * 4. Hardcoded production fallback `https://api.eccchurch.global`.
 *
 * - **Production**: prefer `EXPO_PUBLIC_API_BASE_URL=https://api.eccchurch.global`
 *   di EAS production profile.
 *
 * - **Development**:
 *   - Real device via Expo Go → tidak bisa pakai `localhost` karena
 *     `localhost` di device = device itu sendiri, bukan dev machine.
 *     Auto-detect IP Mac dari Expo dev server hostUri (mis. "192.168.1.5:8081"),
 *     pakai IP itu + port API.
 *   - iOS Simulator → `localhost` works (simulator share network dengan Mac).
 *   - Override manual: set `EXPO_PUBLIC_API_BASE_URL` di `.env.development`
 *     atau `extra.apiBaseUrlDev` di app.json.
 */
function resolveApiBaseUrl(): string {
  // 1. EXPO_PUBLIC_API_BASE_URL — highest priority (build-time env var).
  //    Per Expo docs, EXPO_PUBLIC_* embedded at bundle time.
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // 2. Production / staging — pakai URL fixed dari app.json
  if (!isDev) {
    return extra.apiBaseUrl ?? 'https://api.eccchurch.global';
  }

  // Dev override eksplisit di app.json
  if (extra.apiBaseUrlDev) {
    return extra.apiBaseUrlDev;
  }

  const apiPort = extra.apiPortDev ?? 4100;

  // Real device via Expo Go: extract IP dari Metro hostUri
  // hostUri format: "192.168.1.5:8081" (Expo Router SDK 50+)
  // debuggerHost (legacy): "192.168.1.5:19000"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.replace(/^exp:\/\//, '').split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${apiPort}`;
    }
  }

  // Fallback: localhost (iOS Simulator / dev di mac browser via web)
  return extra.apiBaseUrl ?? `http://localhost:${apiPort}`;
}

// Debug log domain untuk verify production build pakai URL benar
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[env] EXPO_PUBLIC_API_BASE_URL=', process.env.EXPO_PUBLIC_API_BASE_URL);
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  apiKey: extra.apiKey,
  env: extra.env ?? (isDev ? 'development' : 'production'),
};

export const isDevEnv = env.env === 'development';
export const isProd = env.env === 'production';

// Debug log di dev — cek API URL resolved
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[env] API base URL:', env.apiBaseUrl, '| platform:', Platform.OS);
}
