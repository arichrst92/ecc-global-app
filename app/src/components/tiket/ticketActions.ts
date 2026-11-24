/**
 * Aksi tampilan penuh tiket: Simpan ke kalender & Petunjuk arah.
 * Kalender memakai dialog bawaan OS (expo-calendar `createEventInCalendarAsync`),
 * jadi pengguna yang memilih kalender & menyimpan.
 */
import { Linking, Platform } from 'react-native';
import { selfCheckinGraceMs } from '@/utils/time';
import { appRule } from '@/config/appRules';

export type CalendarInput = {
  title: string;
  start: Date;
  end: Date;
  location?: string | null;
  notes?: string | null;
};

export async function addTicketToCalendar(input: CalendarInput): Promise<void> {
  // Import saat dipakai — modul native yang belum ada di build lama tidak membuat app crash saat start.
  const Calendar = await import('expo-calendar');
  // iOS < 17 mewajibkan izin kalender sebelum dialog dibuka; iOS 17+ & Android
  // memakai dialog sistem tanpa izin (izin Android sengaja diblokir di app.json).
  if (Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 17) {
    const { granted } = await Calendar.requestCalendarPermissionsAsync();
    if (!granted) throw new Error('calendar permission denied');
  }
  await Calendar.createEventInCalendarAsync({
    title: input.title,
    startDate: input.start,
    endDate: input.end > input.start ? input.end : new Date(input.start.getTime() + 2 * 60 * 60 * 1000),
    location: input.location ?? undefined,
    notes: input.notes ?? undefined,
  });
}

/** Buka aplikasi peta: link Google Maps admin → titik koordinat → pencarian nama lokasi. */
export async function openDirections(opts: {
  mapsUrl?: string | null;
  point?: { lat: number; lng: number } | null;
  label?: string | null;
}): Promise<void> {
  if (opts.mapsUrl && /^https?:\/\//.test(opts.mapsUrl)) {
    await Linking.openURL(opts.mapsUrl);
    return;
  }
  const label = encodeURIComponent(opts.label ?? '');
  if (opts.point) {
    const { lat, lng } = opts.point;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    await Linking.openURL(url);
    return;
  }
  if (opts.label) {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${label}`);
  }
}

/**
 * Jam mulai/selesai tiket. Server ≥ 2026-11 mengirim startAt/endAt (jendela
 * check-in bisa diatur per ibadah/event). Server lama: jam mulai = dibuka + 15
 * menit; selesai = ditutup dikurangi tenggang 30 menit.
 */
export function ticketTimes(
  opensAt: string | null | undefined,
  closesAt: string | null | undefined,
  startAt?: string | null,
  endAt?: string | null,
) {
  if (startAt) {
    const start = new Date(startAt);
    const endMs = endAt ? Date.parse(endAt) : NaN;
    const end = endMs > start.getTime() ? new Date(endMs) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }
  if (!opensAt) return null;
  // Jam mulai = dibuka + N menit (N dari server, bawaan 15).
  const start = new Date(Date.parse(opensAt) + appRule('selfCheckinOpenBeforeMin') * 60 * 1000);
  const endMs = closesAt ? Date.parse(closesAt) - selfCheckinGraceMs() : NaN;
  const end = endMs > start.getTime() ? new Date(endMs) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}
