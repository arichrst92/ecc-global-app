/**
 * Ambil posisi user sekali (untuk "Cari homecell terdekat").
 *
 * - Native (iOS/Android): expo-location — minta izin "saat aplikasi dipakai".
 * - Web (elsapp): navigator.geolocation (browser akan minta izin; wajib HTTPS).
 *
 * expo-location di-load dinamis supaya build lama / web tidak crash kalau
 * modul belum terpasang (`npx expo install expo-location`).
 */
import { Platform } from 'react-native';

export type Coords = { lat: number; lng: number };

export class LocationError extends Error {
  constructor(
    public reason: 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT',
    message: string,
  ) {
    super(message);
  }
}

function webPosition(maxAgeMs = 5 * 60_000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocationError('UNAVAILABLE', 'Browser tidak mendukung lokasi.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        reject(
          err.code === err.PERMISSION_DENIED
            ? new LocationError('DENIED', 'Izin lokasi ditolak.')
            : err.code === err.TIMEOUT
              ? new LocationError('TIMEOUT', 'Lokasi tidak didapat (waktu habis).')
              : new LocationError('UNAVAILABLE', 'Lokasi tidak tersedia.'),
        ),
      { enableHighAccuracy: maxAgeMs < 5 * 60_000, timeout: 15000, maximumAge: maxAgeMs },
    );
  });
}

/** Subset API expo-location yang dipakai (modul di-load dinamis). */
type Position = { coords: { latitude: number; longitude: number } };
type ExpoLocation = {
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getLastKnownPositionAsync: (o: { maxAge: number }) => Promise<Position | null>;
  getCurrentPositionAsync: (o: { accuracy: number }) => Promise<Position>;
  Accuracy?: { Balanced: number };
};

/**
 * @param opts.maxAgeMs  umur maksimum posisi cache yang boleh dipakai.
 *   Default 5 menit (cari homecell). Self check-in memakai 60 detik supaya
 *   posisi lama (mis. dari rumah) tidak dipakai.
 */
export async function getCurrentCoords(opts: { maxAgeMs?: number } = {}): Promise<Coords> {
  const maxAgeMs = opts.maxAgeMs ?? 5 * 60_000;
  if (Platform.OS === 'web') return webPosition(maxAgeMs);

  let Location: ExpoLocation;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Location = require('expo-location');
  } catch {
    throw new LocationError('UNAVAILABLE', 'Fitur lokasi belum tersedia di versi aplikasi ini.');
  }

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new LocationError('DENIED', 'Izin lokasi ditolak.');
  }
  // Posisi terakhir yang masih segar dulu (cepat), baru minta posisi baru.
  const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs }).catch(() => null);
  if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
  const pos = await Promise.race<Position>([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced ?? 3 }),
    new Promise<Position>((_, rej) =>
      setTimeout(() => rej(new LocationError('TIMEOUT', 'Lokasi tidak didapat (waktu habis).')), 20000),
    ),
  ]);
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
