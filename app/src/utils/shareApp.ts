/**
 * "Share Els App" — teks ajakan + link download Android, iOS, dan web.
 * Penutup memakai tanda tangan yang sama dengan pesan OTP WhatsApp
 * (packages/auth WA_SIGNATURE): "Powered by IDEA".
 */
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '@/i18n';

export const ELS_APP_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=idea.eccchurch.global&pcampaignid=web_share',
  ios: 'https://apps.apple.com/id/app/els-app/id6804400672',
  web: 'https://elsapp.eccchurch.global',
};

/** Sama persis dengan WA_SIGNATURE di pesan OTP. */
export const IDEA_SIGNATURE =
  '_Powered by IDEA (https://ide.asia)_\n_an Enterprise IT Service and Outsourcing Company_';

export function buildShareAppMessage(senderName?: string | null): string {
  const t = i18n.t.bind(i18n);
  return [
    senderName ? t('share_app.greeting_from', { name: senderName }) : t('share_app.greeting'),
    '',
    t('share_app.intro'),
    t('share_app.features'),
    '',
    `${t('share_app.android')}: ${ELS_APP_LINKS.android}`,
    '',
    `${t('share_app.ios')}: ${ELS_APP_LINKS.ios}`,
    '',
    `${t('share_app.web')}: ${ELS_APP_LINKS.web}`,
    '',
    t('share_app.cta'),
    '',
    IDEA_SIGNATURE,
  ].join('\n');
}

/**
 * Buka share sheet (native) / Web Share API. Kalau browser tidak mendukung,
 * salin teks ke clipboard. Return 'shared' | 'copied' | 'cancelled'.
 */
export async function shareElsApp(senderName?: string | null): Promise<'shared' | 'copied' | 'cancelled'> {
  const message = buildShareAppMessage(senderName);
  const title = i18n.t('share_app.title');
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text: message });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    await Clipboard.setStringAsync(message);
    return 'copied';
  }
  const r = await Share.share({ title, message });
  return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
