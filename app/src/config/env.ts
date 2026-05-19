import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  apiKey?: string;
  env?: 'development' | 'staging' | 'production';
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  // Override via app.json `expo.extra.apiBaseUrl` or EAS Secrets
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:4100',
  apiKey: extra.apiKey,
  env: extra.env ?? 'development',
};

export const isDev = env.env === 'development';
export const isProd = env.env === 'production';
