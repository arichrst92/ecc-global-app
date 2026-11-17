import { Tabs } from 'expo-router';
import { Baby, CalendarDays, Church, HandHeart, Home, Target, Ticket, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDark, nc } from '@/theme/ThemeRoot';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Android gesture/3-button navbar + iOS home indicator butuh padding bottom
  // supaya tab bar tidak overlap dengan system UI
  const bottomInset = insets.bottom;

  // Menu bawah (2026-12): Beranda · Resolusi · Reservasi · CKids · Profil.
  // CKids selalu tampil — tanpa anak ≤ 13 tahun, halamannya menjelaskan cara
  // menambahkan anak. Event tidak lagi di menu bawah: dibuka dari Beranda
  // (Quick Access & "Lihat semua") dan Reservasi Saya; route /(tabs)/event tetap.
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: nc('#737373'),
        tabBarStyle: {
          backgroundColor: isDark() ? '#1C1C1E' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: nc('#E5E5E5'),
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
        name="resolution"
        options={{
          title: t('nav.resolusi'),
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reservasi"
        options={{
          title: t('nav.reservasi'),
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ckids"
        options={{
          title: t('nav.ckids'),
          tabBarIcon: ({ color, size }) => <Baby color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="event"
        options={{
          title: t('nav.event'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
          // Tidak di menu bawah — dibuka dari Beranda / Reservasi Saya / deeplink.
          href: null,
        }}
      />
      <Tabs.Screen
        name="ibadah"
        options={{
          title: t('nav.ibadah'),
          tabBarIcon: ({ color, size }) => <Church color={color} size={size} />,
          // Tidak tampil di bottom nav (diganti tab Reservasi). Route tetap ada:
          // Quick Access Beranda, tombol "Lihat jadwal ibadah", deeplink /ibadah.
          href: null,
        }}
      />
      <Tabs.Screen
        name="persembahan"
        options={{
          title: t('nav.persembahan'),
          tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} />,
          // Hidden dari bottom nav di kedua platform (iOS + Android) untuk UX
          // konsisten. Persembahan diakses via tile Quick Access di Home yg
          // langsung open web per-cabang (Apple 3.2.2(iv) compliant, Android
          // ikut pattern sama supaya cross-platform behavior identik).
          // Route tetap registered supaya deeplink /persembahan tetap handled.
          href: null,
        }}
      />
    </Tabs>
  );
}
