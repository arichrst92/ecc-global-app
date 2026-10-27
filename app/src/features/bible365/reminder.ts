/**
 * Pengingat harian Bible 365 — notifikasi LOKAL di HP (expo-notifications),
 * tidak lewat server. Modul native dimuat saat dipakai: kalau belum ada di
 * build (atau web), fungsi ini diam-diam tidak melakukan apa-apa — app tidak
 * boleh crash karena fitur pengingat.
 */
import { Platform } from 'react-native';

const ID = 'bible365-daily';
const CHANNEL = 'bible365';

async function load() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/** Minta izin & jadwalkan pengingat harian "HH:MM". Return false bila tidak bisa. */
export async function scheduleBible365Reminder(hhmm: string, title: string, body: string): Promise<boolean> {
  const N = await load();
  if (!N) return false;
  try {
    const perm = await N.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted && perm.canAskAgain) granted = (await N.requestPermissionsAsync()).granted;
    if (!granted) return false;
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL, { name: 'Bible 365', importance: N.AndroidImportance.DEFAULT });
    }
    await N.cancelScheduledNotificationAsync(ID).catch(() => {});
    const [h, m] = hhmm.split(':').map(Number);
    await N.scheduleNotificationAsync({
      identifier: ID,
      content: { title, body, data: { url: '/bible365' } },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: h ?? 6,
        minute: m ?? 0,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelBible365Reminder(): Promise<void> {
  const N = await load();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(ID);
  } catch {
    /* abaikan */
  }
}

/** Tampilkan notifikasi saat app terbuka juga (dipanggil sekali saat start). */
export async function initNotificationHandler(): Promise<void> {
  const N = await load();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* abaikan */
  }
}
