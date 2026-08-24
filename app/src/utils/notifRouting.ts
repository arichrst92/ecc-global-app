/**
 * Notification routing + icon mapper untuk 16 InAppNotifType.
 * Per BE notice `backend-notice-in-app-notifications.md` (2026-08-03).
 *
 * BE emit `actionUrl` (deep-link path). Mobile primary strategy:
 * pakai actionUrl langsung. Fallback per-type kalau BE emit null actionUrl
 * (mis. informational-only notif).
 */

import type { InAppNotification, InAppNotifType } from '@/types/notification';

/**
 * Resolve deep-link target dari notif. Priority:
 * 1. actionUrl dari BE (kalau ada)
 * 2. Fallback per-type dari metadata
 * 3. null → no navigate (mis. VISIT_RECORDED yang informational)
 */
export function resolveNotifRoute(
  notif: InAppNotification,
): string | null {
  if (notif.actionUrl) return notif.actionUrl;

  const meta = notif.metadata ?? {};
  const anakId = pickString(meta, 'anakId');
  const reservasiId = pickString(meta, 'reservasiId');
  const groupId = pickString(meta, 'groupId');
  const eventId = pickString(meta, 'eventId');
  const homecellId = pickString(meta, 'homecellId');

  switch (notif.type) {
    case 'CKIDS_CHECKIN':
    case 'CKIDS_PICKUP':
      // Prefer parent reservasi list — punya PickupCodeCard prominent
      return '/my-reservasi';

    case 'GIFT_REDEEMED':
    case 'POINT_EARNED':
    case 'POINT_ADJUSTED':
      // Jump ke CKids tab (anak selection akan follow last-selected)
      return anakId ? '/(tabs)/ckids' : '/(tabs)/ckids';

    case 'FAMILY_LINKED':
      return '/family';

    case 'GROUP_MEMBER_ADDED':
    case 'GROUP_MEMBER_REMOVED':
      return groupId ? `/group/${groupId}` : '/group';

    case 'GROUP_DISMISSED':
      return '/group';

    case 'EVENT_REGISTERED':
    case 'EVENT_APPROVED':
    case 'EVENT_CHECKED_IN':
      return eventId ? `/event/${eventId}` : '/(tabs)/event';

    case 'HOMECELL_ATTENDED':
      return homecellId ? `/homecell/${homecellId}` : '/homecell';

    case 'VISIT_RECORDED':
      return '/visit';

    case 'BRANCH_CHANGE_APPROVED':
    case 'BRANCH_CHANGE_REJECTED':
      return '/profile';

    default:
      return null;
  }
}

/**
 * Icon key untuk NotificationRow — mapping ke lucide icon.
 * Return string identifier; komponen render pakai switch untuk lucide component.
 */
export type NotifIconKey =
  | 'baby'
  | 'baby-check'
  | 'handshake'
  | 'gift'
  | 'star'
  | 'sliders'
  | 'family'
  | 'group-add'
  | 'group-remove'
  | 'archive'
  | 'ticket-plus'
  | 'ticket-check'
  | 'ticket-qr'
  | 'home-check'
  | 'user-eye'
  | 'map-check'
  | 'map-x'
  | 'bell';

export function notifIconKey(type: InAppNotifType): NotifIconKey {
  switch (type) {
    case 'CKIDS_CHECKIN':
      return 'baby-check';
    case 'CKIDS_PICKUP':
      return 'handshake';
    case 'GIFT_REDEEMED':
      return 'gift';
    case 'POINT_EARNED':
      return 'star';
    case 'POINT_ADJUSTED':
      return 'sliders';
    case 'FAMILY_LINKED':
      return 'family';
    case 'GROUP_MEMBER_ADDED':
      return 'group-add';
    case 'GROUP_MEMBER_REMOVED':
      return 'group-remove';
    case 'GROUP_DISMISSED':
      return 'archive';
    case 'EVENT_REGISTERED':
      return 'ticket-plus';
    case 'EVENT_APPROVED':
      return 'ticket-check';
    case 'EVENT_CHECKED_IN':
      return 'ticket-qr';
    case 'HOMECELL_ATTENDED':
      return 'home-check';
    case 'VISIT_RECORDED':
      return 'user-eye';
    case 'BRANCH_CHANGE_APPROVED':
      return 'map-check';
    case 'BRANCH_CHANGE_REJECTED':
      return 'map-x';
    default:
      return 'bell';
  }
}

/**
 * Color pair per icon key — background + foreground.
 * Semua pakai tailwind palette yang sudah tersedia.
 */
export function notifIconColors(key: NotifIconKey): {
  bgClass: string;
  fg: string;
} {
  switch (key) {
    case 'baby-check':
    case 'handshake':
      return { bgClass: 'bg-brand-50', fg: '#EA580C' };
    case 'gift':
    case 'star':
      return { bgClass: 'bg-amber-50', fg: '#D97706' };
    case 'sliders':
      return { bgClass: 'bg-neutral-100', fg: '#525252' };
    case 'family':
      return { bgClass: 'bg-emerald-50', fg: '#059669' };
    case 'group-add':
    case 'group-remove':
    case 'archive':
      return { bgClass: 'bg-blue-50', fg: '#1d4ed8' };
    case 'ticket-plus':
    case 'ticket-check':
    case 'ticket-qr':
      return { bgClass: 'bg-purple-50', fg: '#7c3aed' };
    case 'home-check':
      return { bgClass: 'bg-orange-50', fg: '#9a3412' };
    case 'user-eye':
      return { bgClass: 'bg-cyan-50', fg: '#0e7490' };
    case 'map-check':
      return { bgClass: 'bg-green-50', fg: '#16a34a' };
    case 'map-x':
      return { bgClass: 'bg-red-50', fg: '#b91c1c' };
    default:
      return { bgClass: 'bg-neutral-100', fg: '#525252' };
  }
}

function pickString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}
