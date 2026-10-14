/**
 * Lokasi untuk self check-in (radius sesuai pengaturan ibadah/event).
 * - "Di mana saja" / venue tanpa titik lokasi → tidak perlu GPS.
 * - Gagal dapat lokasi / terlalu jauh → tampilkan arahan cari usher (QR).
 */
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { ApiError } from '@/types/api';
import { getCurrentCoords, LocationError, type Coords } from './location';

export class SelfCheckinLocationError extends Error {}

/** 1000 → "1 km", 250 → "250 m". */
export const formatRadius = (m: number) => (m >= 1000 ? `${Number((m / 1000).toFixed(1))} km` : `${m} m`);

/** Ambil posisi segar kalau venue butuh; lempar SelfCheckinLocationError kalau gagal. */
export async function coordsForSelfCheckin(
  venue: { requiresLocation: boolean; radiusM: number | null } | undefined,
): Promise<Coords | null> {
  if (!venue?.requiresLocation) return null;
  const radius = formatRadius(venue.radiusM ?? 0);
  try {
    return await getCurrentCoords({ maxAgeMs: 60_000 });
  } catch (e) {
    const reason = e instanceof LocationError ? e.reason : 'UNAVAILABLE';
    throw new SelfCheckinLocationError(
      reason === 'DENIED' ? i18n.t('selfcheckin_geo.denied', { radius }) : i18n.t('selfcheckin_geo.unavailable'),
    );
  }
}

/** Error radius dari server (SELF_CHECKIN_TOO_FAR / SELF_CHECKIN_LOCATION_REQUIRED)? */
export function isRadiusError(e: unknown): e is ApiError {
  return e instanceof ApiError && /^SELF_CHECKIN_(TOO_FAR|LOCATION_REQUIRED)$/.test(String(e.code));
}

/** Popup: lokasi harus dekat / aktifkan lokasi → tombol Tampilkan QR Saya (untuk usher). */
export function showUsherFallback(message: string, openQr: () => void) {
  Alert.alert(i18n.t('selfcheckin_geo.title'), message, [
    { text: i18n.t('common.close'), style: 'cancel' },
    { text: i18n.t('selfcheckin_geo.show_qr'), onPress: openQr },
  ]);
}
