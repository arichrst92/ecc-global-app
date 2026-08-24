/**
 * In-app notification API — /admin/me/notifications/*
 * Per BE notice `backend-notice-in-app-notifications.md` (deployed 2026-08-03).
 *
 * Endpoints:
 * - GET  /admin/me/notifications          — list feed (cursor pagination)
 * - GET  /admin/me/notifications/unread-count — badge counter (cached 10s server-side)
 * - POST /admin/me/notifications/:id/read     — mark 1 read (idempotent)
 * - POST /admin/me/notifications/mark-all-read — bulk mark read
 *
 * Note: list endpoint pakai raw fetch supaya meta (cursor + hasMore) tetap
 * accessible untuk useInfiniteQuery — pattern sama dgn listMyVisits.
 */

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError, type ApiErrorBody } from '@/types/api';
import { api } from './client';
import type {
  InAppNotification,
  ListNotificationsParams,
  ListNotificationsResponse,
  UnreadCountResponse,
} from '@/types/notification';

/**
 * GET /admin/me/notifications — cursor-paginated feed.
 * Sort by createdAt desc. Cursor via `before` param (ISO datetime).
 */
export async function listNotifications(
  opts: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  const q = params.toString();
  const path = `/admin/me/notifications${q ? `?${q}` : ''}`;

  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${env.apiBaseUrl}${path}`, { method: 'GET', headers });
  const json = (await res.json().catch(() => null)) as
    | {
        success: true;
        data: InAppNotification[];
        meta: { limit: number; hasMore: boolean; nextCursor: string | null };
      }
    | ApiErrorBody
    | null;
  if (!json) {
    throw new ApiError(
      { code: 'INTERNAL_ERROR', message: 'Invalid response' },
      res.status,
    );
  }
  if (!json.success) {
    throw new ApiError(json.error, res.status);
  }
  return { data: json.data, meta: json.meta };
}

/**
 * GET /admin/me/notifications/unread-count — badge counter.
 * Server-side cache 10s, so polling 30s hits DB max 2x/min.
 */
export function getUnreadCount() {
  return api.get<UnreadCountResponse>('/admin/me/notifications/unread-count');
}

/**
 * POST /admin/me/notifications/:id/read — mark one notif as read.
 * Idempotent — kalau sudah read, return existing tanpa error.
 * Guard: kalau jemaatId bukan requester → 403.
 */
export function markNotificationRead(id: string) {
  return api.post<InAppNotification>(
    `/admin/me/notifications/${id}/read`,
    {},
  );
}

/** POST /admin/me/notifications/mark-all-read — bulk clear unread */
export function markAllNotificationsRead() {
  return api.post<{ markedRead: number }>(
    '/admin/me/notifications/mark-all-read',
    {},
  );
}
