/**
 * Notification routing + icon mapper untuk 16 InAppNotifType.
 * Per BE notice `backend-notice-in-app-notifications.md` (2026-08-03).
 *
 * BE emit `actionUrl` (deep-link path). Mobile primary strategy:
 * pakai actionUrl langsung. Fallback per-type kalau BE emit null actionUrl
 * (mis. informational-only notif).
 */

import type { InAppNotification, InAppNotifType } from '@/types/notification';
import { nc } from '@/theme/ThemeRoot';

/**
 * Rute yang benar-benar ada di app (expo-router). actionUrl dari server yang
 * tidak cocok di-normalisasi dulu; kalau tetap tidak cocok → pakai fallback
 * per tipe, atau tidak navigasi (jangan pernah "Unmatched route").
 */
const ID = '[^/?#]+';
const KNOWN_ROUTES: RegExp[] = [
  '/', '/my-reservasi', '/ckids', '/(tabs)/ckids', '/(tabs)/event', '/(tabs)/ibadah', '/family',
  '/group', `/group/${ID}`, '/profile/my-groups',
  '/event', `/event/${ID}`, '/ibadah', `/ibadah/${ID}`,
  '/homecell', '/homecell/requests', `/homecell/view/${ID}`, `/homecell/${ID}`,
  '/visit', `/visit/${ID}`, '/profile', '/settings/change-branch',
  '/ministry', `/ministry/${ID}`, '/feedback', `/feedback/${ID}`,
  '/doa', `/doa/${ID}`, `/doa/assigned/${ID}`, '/notifications', '/tiket', '/spiritual-journey', '/profile/my-service',
].map((p) => new RegExp(`^${p.replace(/[()]/g, '\\$&')}/?(\\?.*)?$`));

const isKnownRoute = (url: string) => KNOWN_ROUTES.some((re) => re.test(url));

/** Path lama / salah dari server → rute app yang benar. */
function normalizeActionUrl(url: string, type: InAppNotifType): string {
  let u = url.trim();
  if (u.startsWith('/ckids/reservasi')) return '/my-reservasi';
  if (u.startsWith('/ckids/anak')) return '/ckids';
  u = u.replace(/^\/groups(?=\/|$|\?)/, '/group'); // server lama: /groups, /groups/:id
  u = u.replace(/^\/visits(?=\/|$|\?)/, '/visit'); // server lama: /visits/:id
  if (u.startsWith('/profile/branch')) return '/settings/change-branch';
  // /homecell/:id = halaman kelola pemimpin; anggota (notif kehadiran) → tampilan anggota.
  const hc = /^\/homecell\/([^/?#]+)$/.exec(u);
  if (hc && hc[1] !== 'requests' && hc[1] !== 'guest' && type === 'HOMECELL_ATTENDED') return `/homecell/view/${hc[1]}`;
  return u;
}

/**
 * Dikeluarkan / dibubarkan / ditolak: TIDAK pernah membuka halaman detail
 * (grup sudah tidak bisa diakses) — selalu ke daftar.
 */
function exitRoute(type: InAppNotifType): string | null {
  switch (type) {
    case 'GROUP_MEMBER_REMOVED':
    case 'GROUP_DISMISSED':
    case 'GROUP_JOIN_REJECTED':
      return '/group';
    case 'HOMECELL_JOIN_REJECTED':
      return '/homecell';
    default:
      return null;
  }
}

/**
 * Resolve deep-link target dari notif. Priority:
 * 1. Notif "keluar" (dikeluarkan / dibubarkan / ditolak) → daftar, bukan detail
 * 2. actionUrl dari BE (dinormalisasi & divalidasi)
 * 3. Fallback per-type dari metadata (divalidasi)
 * 4. null → tidak navigasi
 */
export function resolveNotifRoute(
  notif: InAppNotification,
): string | null {
  const exit = exitRoute(notif.type);
  if (exit) return exit;
  if (notif.actionUrl) {
    const url = normalizeActionUrl(notif.actionUrl, notif.type);
    if (isKnownRoute(url)) return url;
  }
  const fb = fallbackRoute(notif);
  return fb && isKnownRoute(fb) ? fb : null;
}

function fallbackRoute(notif: InAppNotification): string | null {
  const meta = notif.metadata ?? {};
  const anakId = pickString(meta, 'anakId');
  const reservasiId = pickString(meta, 'reservasiId');
  const groupId = pickString(meta, 'groupId');
  const eventId = pickString(meta, 'eventId');
  const homecellId = pickString(meta, 'homecellId');
  const ministryId = pickString(meta, 'ministryId');

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
      return homecellId ? `/homecell/view/${homecellId}` : '/homecell';

    case 'VISIT_RECORDED':
      return '/visit';

    case 'BRANCH_CHANGE_APPROVED':
    case 'BRANCH_CHANGE_REJECTED':
      return '/settings/change-branch';

    case 'MINISTRY_JOIN_REQUESTED':
    case 'MINISTRY_JOIN_APPROVED':
    case 'MINISTRY_JOIN_REJECTED':
      return ministryId ? `/ministry/${ministryId}` : '/ministry';

    case 'HOMECELL_JOIN_REQUESTED':
      return '/homecell/requests';
    case 'HOMECELL_JOIN_APPROVED':
    case 'HOMECELL_ANNOUNCEMENT':
    case 'HOMECELL_POLL_CREATED':
      return homecellId ? `/homecell/view/${homecellId}` : '/homecell';
    case 'HOMECELL_JOIN_REJECTED':
      return '/homecell';

    case 'GROUP_JOIN_REQUESTED':
    case 'GROUP_JOIN_APPROVED':
    case 'GROUP_ANNOUNCEMENT':
    case 'GROUP_POLL_CREATED':
      return groupId ? `/group/${groupId}` : '/group';
    case 'GROUP_JOIN_REJECTED':
      return '/group';

    case 'FEEDBACK_REPLIED': {
      const fid = pickString(meta, 'feedbackId');
      return fid ? `/feedback/${fid}` : '/feedback';
    }

    case 'PRAYER_ASSIGNED': {
      const pid = pickString(meta, 'prayerId');
      return pid ? `/doa/assigned/${pid}` : '/doa?tab=assigned';
    }
    case 'PRAYER_PRAYED': {
      const pid = pickString(meta, 'prayerId');
      return pid ? `/doa/${pid}` : '/doa';
    }
    case 'SPIRITUAL_JOURNEY_APPROVED':
    case 'SPIRITUAL_JOURNEY_REJECTED':
      return '/spiritual-journey';
    case 'FAMILY_LINK_REQUESTED':
    case 'FAMILY_LINK_APPROVED':
    case 'FAMILY_LINK_REJECTED':
      return '/family';
    case 'MINISTRY_DUTY_ASSIGNED':
    case 'MINISTRY_DUTY_REMOVED':
      return '/profile/my-service';

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
    case 'MINISTRY_JOIN_REQUESTED':
      return 'group-add';
    case 'MINISTRY_JOIN_APPROVED':
      return 'family';
    case 'MINISTRY_JOIN_REJECTED':
      return 'group-remove';
    case 'HOMECELL_JOIN_REQUESTED':
      return 'group-add';
    case 'HOMECELL_JOIN_APPROVED':
      return 'home-check';
    case 'HOMECELL_JOIN_REJECTED':
      return 'group-remove';
    case 'GROUP_JOIN_REQUESTED':
      return 'group-add';
    case 'GROUP_JOIN_APPROVED':
      return 'family';
    case 'GROUP_JOIN_REJECTED':
      return 'group-remove';
    case 'PRAYER_ASSIGNED':
      return 'group-add';
    case 'PRAYER_PRAYED':
      return 'home-check';
    case 'SPIRITUAL_JOURNEY_APPROVED':
      return 'home-check';
    case 'SPIRITUAL_JOURNEY_REJECTED':
      return 'group-remove';
    case 'FAMILY_LINK_REQUESTED':
      return 'group-add';
    case 'FAMILY_LINK_APPROVED':
      return 'home-check';
    case 'FAMILY_LINK_REJECTED':
      return 'group-remove';
    case 'MINISTRY_DUTY_ASSIGNED':
      return 'home-check';
    case 'MINISTRY_DUTY_REMOVED':
      return 'group-remove';
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
      return { bgClass: 'bg-neutral-100', fg: nc('#525252') };
    case 'family':
      return { bgClass: 'bg-emerald-50', fg: '#059669' };
    case 'group-add':
    case 'group-remove':
    case 'archive':
      return { bgClass: 'bg-blue-50', fg: nc('#1d4ed8') };
    case 'ticket-plus':
    case 'ticket-check':
    case 'ticket-qr':
      return { bgClass: 'bg-purple-50', fg: '#7c3aed' };
    case 'home-check':
      return { bgClass: 'bg-orange-50', fg: nc('#9a3412') };
    case 'user-eye':
      return { bgClass: 'bg-cyan-50', fg: nc('#0e7490') };
    case 'map-check':
      return { bgClass: 'bg-green-50', fg: '#16a34a' };
    case 'map-x':
      return { bgClass: 'bg-red-50', fg: nc('#b91c1c') };
    default:
      return { bgClass: 'bg-neutral-100', fg: nc('#525252') };
  }
}

function pickString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}
