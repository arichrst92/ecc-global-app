import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCheck,
  Church,
  CreditCard,
  HandHeart,
  Newspaper,
  Users,
} from 'lucide-react-native';

import { useNotificationsStore } from '@/stores/notifications.store';
import type {
  NotificationCategory,
  NotificationItem,
} from '@/stores/notifications.store';

function categoryIcon(cat: NotificationCategory): {
  icon: React.ReactNode;
  bg: string;
} {
  switch (cat) {
    case 'ibadah':
      return {
        icon: <Church size={18} color="#EA580C" />,
        bg: 'bg-brand-50',
      };
    case 'event':
      return {
        icon: <CalendarDays size={18} color="#D97706" />,
        bg: 'bg-amber-50',
      };
    case 'renungan':
      return {
        icon: <Newspaper size={18} color="#7c3aed" />,
        bg: 'bg-purple-50',
      };
    case 'news':
      return {
        icon: <Newspaper size={18} color="#525252" />,
        bg: 'bg-neutral-100',
      };
    case 'payment':
      return {
        icon: <CreditCard size={18} color="#1d4ed8" />,
        bg: 'bg-blue-50',
      };
    case 'family':
      return {
        icon: <Users size={18} color="#059669" />,
        bg: 'bg-emerald-50',
      };
    case 'branch_change':
      return {
        icon: <HandHeart size={18} color="#9a3412" />,
        bg: 'bg-orange-50',
      };
    case 'system':
    default:
      return {
        icon: <Bell size={18} color="#525252" />,
        bg: 'bg-neutral-100',
      };
  }
}

function groupByDate(items: NotificationItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;

  const groups: Record<'today' | 'yesterday' | 'earlier', NotificationItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const item of items) {
    if (item.createdAt >= today) groups.today.push(item);
    else if (item.createdAt >= yesterday) groups.yesterday.push(item);
    else groups.earlier.push(item);
  }
  return groups;
}

type TFn = (key: string, opts?: { count?: number }) => string;

function timeAgo(ts: number, t: TFn): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t('notifications.now');
  if (m < 60) return t('notifications.minutes_ago', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notifications.hours_ago', { count: h });
  const d = Math.floor(h / 24);
  return t('notifications.days_ago', { count: d });
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const groups = useMemo(() => groupByDate(items), [items]);
  const hasUnread = items.some((i) => !i.read);

  function handleTap(item: NotificationItem) {
    if (!item.read) markRead(item.id);
    if (item.deepLink) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(item.deepLink as any);
    }
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('notifications.title')}
          </Text>
          {hasUnread ? (
            <Pressable
              onPress={() => markAllRead()}
              className="flex-row items-center gap-1.5 px-3 py-1.5"
            >
              <CheckCheck size={14} color="#EA580C" />
              <Text className="text-xs font-semibold text-brand-600">
                {t('notifications.mark_all_read')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
      >
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {groups.today.length > 0 ? (
              <Section title={t('notifications.section_today')}>
                {groups.today.map((n) => (
                  <NotificationRow key={n.id} item={n} onPress={() => handleTap(n)} />
                ))}
              </Section>
            ) : null}
            {groups.yesterday.length > 0 ? (
              <Section title={t('notifications.section_yesterday')}>
                {groups.yesterday.map((n) => (
                  <NotificationRow key={n.id} item={n} onPress={() => handleTap(n)} />
                ))}
              </Section>
            ) : null}
            {groups.earlier.length > 0 ? (
              <Section title={t('notifications.section_earlier')}>
                {groups.earlier.map((n) => (
                  <NotificationRow key={n.id} item={n} onPress={() => handleTap(n)} />
                ))}
              </Section>
            ) : null}
          </>
        )}

        {/* Push notif coming-soon notice di-hide per user feedback —
            sudah ada local triggers untuk event flows, family link, branch
            change, dll. User tidak perlu disclaimer "in development". */}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-3">
      <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 px-1">
        {title}
      </Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const cat = categoryIcon(item.category);
  return (
    <Pressable
      onPress={onPress}
      className={`p-3 rounded-2xl flex-row items-start gap-3 ${
        item.read ? 'bg-white border border-neutral-100' : 'bg-brand-50 border border-brand-100'
      }`}
    >
      <View className={`w-10 h-10 rounded-xl ${cat.bg} items-center justify-center`}>
        {cat.icon}
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-start gap-2">
          <Text
            className={`flex-1 text-sm font-semibold ${
              item.read ? 'text-neutral-700' : 'text-neutral-900'
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
            item.read ? 'text-neutral-500' : 'text-neutral-700'
          }`}
          numberOfLines={2}
        >
          {item.body}
        </Text>
      </View>
      {!item.read ? (
        <View className="w-2 h-2 rounded-full bg-brand-500 mt-1" />
      ) : null}
    </Pressable>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="items-center py-20 px-8">
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
