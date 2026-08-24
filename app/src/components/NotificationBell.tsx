/**
 * NotificationBell — reusable header bell dgn badge unread count.
 *
 * Per BE notice `backend-notice-in-app-notifications.md` (2026-08-03).
 * Poll unread-count every 30s via `useNotificationBadge`.
 *
 * Usage:
 * ```tsx
 * <NotificationBell variant="light" />  // untuk dark background (home hero)
 * <NotificationBell variant="dark" />   // untuk light background (regular)
 * ```
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';

import { useNotificationBadge } from '@/hooks/useNotifications';

type Variant = 'light' | 'dark';

type Props = {
  /** 'light' untuk dark bg (icon putih), 'dark' untuk light bg (icon neutral). */
  variant?: Variant;
  /** Icon size — default 20. */
  size?: number;
  /** Badge border color — untuk blend dgn bg parent. Default match variant. */
  badgeBorderColor?: string;
};

export function NotificationBell({
  variant = 'dark',
  size = 20,
  badgeBorderColor,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const badgeQuery = useNotificationBadge();

  const count = badgeQuery.data?.count ?? 0;
  const displayCount = count > 99 ? '99+' : String(count);
  const isLight = variant === 'light';

  const iconColor = isLight ? '#fff' : '#171717';
  const bgClass = isLight ? 'bg-white/15' : 'bg-neutral-100';
  const defaultBadgeBorder = isLight ? '#F97316' : '#F5F5F5';
  const borderColor = badgeBorderColor ?? defaultBadgeBorder;

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      className={`${bgClass} rounded-full p-2`}
      accessibilityLabel={t('notifications.title')}
      accessibilityRole="button"
    >
      <Bell size={size} color={iconColor} />
      {count > 0 ? (
        <View
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center"
          style={{ borderWidth: 2, borderColor }}
        >
          <Text className="text-[10px] font-bold text-white">
            {displayCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
