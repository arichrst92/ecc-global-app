// App version check types per BE patch 22b.
// Endpoint: GET /public/app-version?platform=ios|android&currentVersion=1.0.0

export type AppVersionPlatform = 'IOS' | 'ANDROID';

export type AppVersionInfo = {
  platform: AppVersionPlatform;
  /** null kalau admin belum publish row di platform ini */
  latestVersion: string | null;
  minSupportedVersion: string | null;
  updateAvailable: boolean;
  forceUpdate: boolean;
  releaseNotes: string | null;
  downloadUrl: string | null;
  publishedAt: string | null;
};
