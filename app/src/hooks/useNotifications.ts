/**
 * React Query hooks untuk in-app notifications.
 * Per BE notice `backend-notice-in-app-notifications.md` (2026-08-03).
 *
 * Polling strategy:
 * - unread-count: refetch every 30s (badge di bell icon)
 * - list: manual pull-to-refresh + refetch on mount
 *
 * Push notif (FCM) deferred — untuk sekarang polling sudah cukup.
 */

import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notification';
import { useAuthStore } from '@/stores/auth.store';
import type { InAppNotification } from '@/types/notification';

const PAGE_LIMIT = 20;

export const NOTIF_KEYS = {
  all: ['notifications'] as const,
  list: () => [...NOTIF_KEYS.all, 'list'] as const,
  unreadCount: () => [...NOTIF_KEYS.all, 'unread-count'] as const,
};

/**
 * Badge counter — poll every 30s.
 * Hanya jalan kalau user authenticated (skip untuk guest).
 * Refetch on window focus supaya balik dari background langsung update.
 */
export function useNotificationBadge() {
  const isAuthenticated = useAuthStore(
    (s) => !!s.accessToken && !s.isGuest,
  );
  return useQuery({
    queryKey: NOTIF_KEYS.unreadCount(),
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    // Server-side cache 10s — client stale window 25s (< poll interval)
    staleTime: 25_000,
  });
}

/**
 * Infinite scroll notification list.
 * Cursor-based via meta.nextCursor.
 */
export function useNotificationsList() {
  const isAuthenticated = useAuthStore(
    (s) => !!s.accessToken && !s.isGuest,
  );
  return useInfiniteQuery({
    queryKey: NOTIF_KEYS.list(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listNotifications({
        limit: PAGE_LIMIT,
        ...(pageParam ? { before: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.nextCursor ?? undefined : undefined,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/**
 * Convenience: flatten all pages ke single array.
 * Note: caller tetap perlu useNotificationsList() untuk akses
 * fetchNextPage, isFetchingNextPage, etc.
 */
export function useFlatNotifications() {
  const query = useNotificationsList();
  const items = useMemo<InAppNotification[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.data),
    [query.data],
  );
  return { ...query, items };
}

/** Mark 1 notif read — optimistic update badge + list. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (_data, id) => {
      // Optimistic decrement badge
      qc.setQueryData<{ count: number } | undefined>(
        NOTIF_KEYS.unreadCount(),
        (prev) =>
          prev && prev.count > 0
            ? { count: prev.count - 1 }
            : prev,
      );
      // Update list cache — mark readAt on matched row
      qc.setQueriesData(
        { queryKey: NOTIF_KEYS.list() },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const data = old as {
            pages: Array<{ data: InAppNotification[]; meta: unknown }>;
            pageParams: unknown[];
          };
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              data: page.data.map((n) =>
                n.id === id && !n.readAt
                  ? { ...n, readAt: new Date().toISOString() }
                  : n,
              ),
            })),
          };
        },
      );
    },
  });
}

/** Bulk mark-all-read — reset badge + invalidate list. */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.setQueryData(NOTIF_KEYS.unreadCount(), { count: 0 });
      qc.invalidateQueries({ queryKey: NOTIF_KEYS.list() });
    },
  });
}
