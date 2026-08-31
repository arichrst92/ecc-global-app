import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Baby, CalendarDays, Church, HandHeart, Home, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyChildren } from '@/hooks/useCKids';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Android gesture/3-button navbar + iOS home indicator butuh padding bottom
  // supaya tab bar tidak overlap dengan system UI
  const bottomInset = insets.bottom;

  // Conditional CKids tab visibility — hanya tampil kalau user punya minimal 1
  // anak (via family relations role=CHILD). Kalau tidak ada anak, tab tetap
  // registered ke router (accessible via deeplink) tapi hidden dari tab bar.
  // Per BE notice ckids-mobile-tab 2026-08-01.
  const { children: myChildren, isPending: childrenPending } = useMyChildren();
  const showCKidsTab = !childrenPending && myChildren.length > 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingTop: 6,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          height: 64 + bottomInset,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ibadah"
        options={{
          title: t('nav.ibadah'),
          tabBarIcon: ({ color, size }) => <Church color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="event"
        options={{
          title: t('nav.event'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ckids"
        options={{
          title: t('nav.ckids'),
          tabBarIcon: ({ color, size }) => <Baby color={color} size={size} />,
          // Hidden kalau user tidak punya anak — route tetap accessible via
          // deeplink /ckids atau nested route dari profil.
          href: showCKidsTab ? undefined : null,
          // Custom pink accent kalau tampil (subtle differentiation)
          tabBarActiveTintColor: '#F97316',
        }}
      />
      <Tabs.Screen
        name="persembahan"
        options={{
          title: t('nav.persembahan'),
          tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} />,
          // iOS: hide tab per Apple Guideline 3.2.2(iv) — charitable donation
          // requires Benevity/Candid nonprofit approval. Route tetap accessible
          // via deeplink; screen internal-nya self-detect Platform + redirect
          // ke external Safari link (eccchurch.global/persembahan).
          // Android tetap show tab full in-app persembahan.
          href: Platform.OS === 'ios' ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
