import { Tabs } from 'expo-router';
import { Home, Church, CalendarDays, HandHeart, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BiometricEnrollmentModal } from '@/components/auth/BiometricEnrollmentModal';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Android gesture/3-button navbar + iOS home indicator butuh padding bottom
  // supaya tab bar tidak overlap dengan system UI
  const bottomInset = insets.bottom;
  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // explicit — supaya dark mode iOS tidak bikin hitam
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingTop: 6,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          height: 64 + bottomInset,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
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
        name="persembahan"
        options={{
          title: t('nav.persembahan'),
          tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} />,
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
    <BiometricEnrollmentModal />
    </>
  );
}
