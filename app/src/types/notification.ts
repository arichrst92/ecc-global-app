/**
 * In-app notification types per BE notice `backend-notice-in-app-notifications.md`
 * (deployed 2026-08-03, adopt Sprint 6 / v1.6.0).
 *
 * BE endpoint prefix: /admin/me/notifications/*
 * Poll strategy: unread-count every 30s.
 * Push notif (FCM) deferred to later sprint.
 */

/**
 * 16 tipe notifikasi in-app dari BE (per v1.2 spec 2026-08-03 P3 extension).
 *
 * Grouping semantic:
 * - CKids parent alerts (5): CKIDS_CHECKIN, CKIDS_PICKUP, GIFT_REDEEMED,
 *   POINT_EARNED, POINT_ADJUSTED
 * - Family (1): FAMILY_LINKED
 * - Group (3): GROUP_MEMBER_ADDED, GROUP_MEMBER_REMOVED, GROUP_DISMISSED
 * - Event (3): EVENT_REGISTERED, EVENT_APPROVED, EVENT_CHECKED_IN
 * - Homecell (1): HOMECELL_ATTENDED
 * - Visit (1): VISIT_RECORDED
 * - Branch change (2): BRANCH_CHANGE_APPROVED, BRANCH_CHANGE_REJECTED
 */
export type InAppNotifType =
  | 'CKIDS_CHECKIN'
  | 'CKIDS_PICKUP'
  | 'GIFT_REDEEMED'
  | 'POINT_EARNED'
  | 'POINT_ADJUSTED'
  | 'FAMILY_LINKED'
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_MEMBER_REMOVED'
  | 'GROUP_DISMISSED'
  | 'EVENT_REGISTERED'
  | 'EVENT_APPROVED'
  | 'EVENT_CHECKED_IN'
  | 'HOMECELL_ATTENDED'
  | 'VISIT_RECORDED'
  | 'BRANCH_CHANGE_APPROVED'
  | 'BRANCH_CHANGE_REJECTED';

/**
 * Metadata JSON per notif type — kontennya bervariasi.
 * Kunci umum yang mungkin muncul (per docs):
 * - CKIDS_CHECKIN: { anakId, reservasiId, pickupCode, ibadahNama, ibadahId, tanggalIbadah }
 * - CKIDS_PICKUP: { anakId, reservasiId, ibadahNama, pickedUpAt, pickedUpBy }
 * - GIFT_REDEEMED: { anakId, redeemId, hadiahNama, pointDeducted, cabangId }
 * - POINT_EARNED: { anakId, pointAmount, source }
 * - POINT_ADJUSTED: { anakId, delta, reason, adminName }
 * - FAMILY_LINKED: { relatorJemaatId, relatorNama, tipeRelasi }
 * - GROUP_MEMBER_ADDED / _REMOVED: { groupId, groupNama }
 * - GROUP_DISMISSED: { groupId, groupNama }
 * - EVENT_*: { eventId, eventNama }
 * - HOMECELL_ATTENDED: { homecellId, homecellNama, tanggalPertemuan }
 * - VISIT_RECORDED: { visitId, visitorNama }
 * - BRANCH_CHANGE_*: { requestId, cabangIdBaru, cabangNama, reason? }
 *
 * Mobile side sebaiknya pakai loose Record<string, unknown> supaya BE extend
 * tanpa breaking parse.
 */
export type InAppNotifMetadata = Record<string, unknown> | null;

/** Row utama dari GET /admin/me/notifications */
export type InAppNotification = {
  id: string;
  jemaatId: string;
  type: InAppNotifType;
  title: string;
  body: string;
  /** Deep-link route ke screen tujuan (mis. "/ckids/reservasi/uuid").
   *  Bisa null kalau notif informational only. */
  actionUrl: string | null;
  metadata: InAppNotifMetadata;
  /** null = unread */
  readAt: string | null;
  createdAt: string;
};

/** Cursor-based pagination meta */
export type NotifPageMeta = {
  limit: number;
  hasMore: boolean;
  /** ISO datetime cursor — pass as `before` in next request */
  nextCursor: string | null;
};

/** Response GET /admin/me/notifications */
export type ListNotificationsResponse = {
  data: InAppNotification[];
  meta: NotifPageMeta;
};

/** Response GET /admin/me/notifications/unread-count */
export type UnreadCountResponse = {
  count: number;
};

/** Params GET /admin/me/notifications */
export type ListNotificationsParams = {
  limit?: number;
  /** ISO datetime cursor — return rows createdAt < before */
  before?: string;
};
