/**
 * Notifications screen — real BE-backed feed via /admin/me/notifications.
 * Per BE notice `backend-notice-in-app-notifications.md` (2026-08-03).
 *
 * Features:
 * - Cursor-based infinite scroll
 * - Group by Today / Yesterday / Earlier
 * - Tap notif → mark read + navigate ke actionUrl
 * - Header action: Mark all read
 * - Empty state
 *
 * Previous version pakai local zustand `notifications.store` — di-deprecate
 * karena BE deliver real in-app feed.
 */
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArrowLeft,
  Baby,
  Bell,
  CheckCheck,
  Eye,
  Gift,
  Handshake,
  Home,
  MapPin,
  MapPinOff,
  Sliders,
  Star,
  Ticket,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react-native';

import {
  useFlatNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/useNotifications';
import {
  notifIconColors,
  notifIconKey,
  resolveNotifRoute,
  type NotifIconKey,
} from '@/utils/notifRouting';
import type { InAppNotification } from '@/types/notification';

/* ==============================================================
 * ICON RENDERER
 * ============================================================== */
function NotifIcon({ iconKey, color }: { iconKey: NotifIconKey; color: string }) {
  switch (iconKey) {
    case 'baby-check':
      return <Baby size={18} color={color} />;
    case 'handshake':
      return <Handshake size={18} color={color} />;
    case 'gift':
      return <Gift size={18} color={color} />;
    case 'star':
      return <Star size={18} color={color} />;
    case 'sliders':
      return <Sliders size={18} color={color} />;
    case 'family':
      return <Users size={18} color={color} />;
    case 'group-add':
      return <UserPlus size={18} color={color} />;
    case 'group-remove':
      return <UserX size={18} color={color} />;
    case 'archive':
      return <Archive size={18} color={color} />;
    case 'ticket-plus':
    case 'ticket-check':
    case 'ticket-qr':
      return <Ticket size={18} color={color} />;
    case 'home-check':
      return <Home size={18} color={color} />;
    case 'user-eye':
      return <Eye size={18} color={color} />;
    case 'map-check':
      return <MapPin size={18} color={color} />;
    case 'map-x':
      return <MapPinOff size={18} color={color} />;
    default:
      return <Bell size={18} color={color} />;
  }
}

/* ==============================================================
 * TIME AGO
 * ============================================================== */
type TFn = (key: string, opts?: { count?: number }) => string;

function timeAgo(iso: string, t: TFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t('notifications.now');
  if (m < 60) return t('notifications.minutes_ago', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notifications.hours_ago', { count: h });
  const d = Math.floor(h / 24);
  return t('notifications.days_ago', { count: d });
}

/* ==============================================================
 * GROUP BY DATE
 * ============================================================== */
type Section = { title: string; data: InAppNotification[] };

function groupSections(items: InAppNotification[], t: TFn): Section[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;

  const buckets = { today: [] as InAppNotification[], yesterday: [] as InAppNotification[], earlier: [] as InAppNotification[] };
  for (const n of items) {
    const ts = new Date(n.createdAt).getTime();
    if (ts >= today) buckets.today.push(n);
    else if (ts >= yesterday) buckets.yesterday.push(n);
    else buckets.earlier.push(n);
  }

  const sections: Section[] = [];
  if (buckets.today.length)
    sections.push({ title: t('notifications.section_today'), data: buckets.today });
  if (buckets.yesterday.length)
    sections.push({ title: t('notifications.section_yesterday'), data: buckets.yesterday });
  if (buckets.earlier.length)
    sections.push({ title: t('notifications.section_earlier'), data: buckets.earlier });
  return sections;
}

/* ==============================================================
 * MAIN SCREEN
 * ============================================================== */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const query = useFlatNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = query.items;
  const hasUnread = items.some((n) => !n.readAt);

  const sections = useMemo(() => groupSections(items, t as TFn), [items, t]);

  // Flatten sections back to a single list with header rows untuk FlatList.
  const listData = useMemo(() => {
    const rows: Array<
      | { kind: 'section'; title: string }
      | { kind: 'row'; notif: InAppNotification }
    > = [];
    for (const s of sections) {
      rows.push({ kind: 'section', title: s.title });
      for (const n of s.data) rows.push({ kind: 'row', notif: n });
    }
    return rows;
  }, [sections]);

  function handleTap(notif: InAppNotification) {
    if (!notif.readAt) markRead.mutate(notif.id);
    const route = resolveNotifRoute(notif);
    if (route) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(route as any);
    }
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
            accessibilityLabel={t('common.back')}
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('notifications.title')}
          </Text>
          {hasUnread ? (
            <Pressable
              onPress={() => markAllRead.mutate()}
              className="flex-row items-center gap-1.5 px-3 py-1.5"
              disabled={markAllRead.isPending}
            >
              <CheckCheck size={14} color="#EA580C" />
              <Text className="text-xs font-semibold text-brand-600">
                {t('notifications.mark_all_read')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {query.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-red-600 text-center mb-3">
            {t('error.generic')}
          </Text>
          <Pressable onPress={() => query.refetch()}>
            <Text className="text-sm font-bold text-brand-600">
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            item.kind === 'section' ? `s-${item.title}-${idx}` : `n-${item.notif.id}`
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
          onRefresh={() => query.refetch()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          renderItem={({ item }) => {
            if (item.kind === 'section') {
              return (
                <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-4 mb-2 px-1">
                  {item.title}
                </Text>
              );
            }
            return <NotifRow item={item.notif} onPress={() => handleTap(item.notif)} />;
          }}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#F97316" size="small" />
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
        />
      )}
    </View>
  );
}

/* ==============================================================
 * NOTIFICATION ROW
 * ============================================================== */
function NotifRow({
  item,
  onPress,
}: {
  item: InAppNotification;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const iconKey = notifIconKey(item.type);
  const colors = notifIconColors(iconKey);
  const isUnread = !item.readAt;

  return (
    <Pressable
      onPress={onPress}
      className={`p-3 rounded-2xl flex-row items-start gap-3 ${
        isUnread
          ? 'bg-brand-50 border border-brand-100'
          : 'bg-white border border-neutral-100'
      }`}
    >
      <View
        className={`w-10 h-10 rounded-xl ${colors.bgClass} items-center justify-center`}
      >
        <NotifIcon iconKey={iconKey} color={colors.fg} />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-start gap-2">
          <Text
            className={`flex-1 text-sm font-semibold ${
              isUnread ? 'text-neutral-900' : 'text-neutral-700'
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text className="text-[10px] text-neutral-400">
            {timeAgo(item.createdAt, t as TFn)}
          </Text>
        </View>
        <Text
          className={`text-xs mt-0.5 ${
            isUnread ? 'text-neutral-700' : 'text-neutral-500'
          }`}
          numberOfLines={2}
        >
          {item.body}
        </Text>
      </View>
      {isUnread ? (
        <View className="w-2 h-2 rounded-full bg-brand-500 mt-1" />
      ) : null}
    </Pressable>
  );
}

/* ==============================================================
 * EMPTY STATE
 * ============================================================== */
function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
        <Bell size={32} color="#A3A3A3" />
      </View>
      <Text className="text-lg font-semibold text-neutral-700">
        {t('notifications.empty_title')}
      </Text>
      <Text className="text-sm text-neutral-500 text-center mt-1">
        {t('notifications.empty_msg')}
      </Text>
    </View>
  );
}
