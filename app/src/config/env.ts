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
 * - **Production**: pakai `extra.apiBaseUrl` dari app.json
 *   (mis. https://core-api.eccchurch.global).
 *
 * - **Development**:
 *   - Real device via Expo Go → tidak bisa pakai `localhost` karena
 *     `localhost` di device = device itu sendiri, bukan dev machine.
 *     Auto-detect IP Mac dari Expo dev server hostUri (mis. "192.168.1.5:8081"),
 *     pakai IP itu + port API.
 *   - iOS Simulator → `localhost` works (simulator share network dengan Mac).
 *   - Override manual: set `extra.apiBaseUrlDev` di app.json kalau perlu URL
 *     fixed (mis. staging server saat dev).
 */
function resolveApiBaseUrl(): string {
  // Production / staging — pakai URL fixed dari app.json
  if (!isDev) {
    return extra.apiBaseUrl ?? 'https://core-api.eccchurch.global';
  }

  // Dev override eksplisit di app.json (highest priority)
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
