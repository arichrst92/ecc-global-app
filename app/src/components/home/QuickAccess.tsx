import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CalendarDays,
  Church,
  HandHeart,
  HandHelping,
  Handshake,
  HeartHandshake,
  House,
  MapPinned,
  Newspaper,
  Sparkles,
  Store,
  Target,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';

import { openGiving } from '@/utils/giving';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { useManagedAreas } from '@/hooks/useHomecell';
import { getPrayerSummary } from '@/api/prayer';

type QuickAccessTile = {
  key: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: string;
};

const ICON_COLOR = '#EA580C';
/** Minimal 4 kolom (HP); layar lebih lebar (tablet/web) → lebih banyak kolom. */
const MIN_COLS = 4;
/** Lebar minimum satu tile (ikon 56 + label) termasuk padding. */
const MIN_TILE_WIDTH = 84;

/**
 * Quick Access grid di dashboard (grid 4 kolom, dikelompokkan per tema):
 *   1. Ibadah, Event, Beri, Berita
 *   2. Renungan, Alkitab, Doa, Resolusi
 *   3. Keluarga, Tamu, Group, Homecell
 *   4. Ministry, (Area — PIC area), Visit, Local Market
 * Jumlah kolom menyesuaikan lebar layar (min 4); tile mengalir ke kanan
 * lalu turun, baris terakhir dibiarkan apa adanya (tanpa placeholder).
 * Scanner → ikon di header Home; Kalender → header Profil.
 * Tamu (guest mode) memakai GuestHomeView, jadi grid ini hanya untuk login.
 */
export function QuickAccess() {
  const { t } = useTranslation();
  const router = useRouter();
  const { branch: viewingBranch } = useViewingBranch();

  const areasQuery = useManagedAreas();
  const isPicArea = (areasQuery.data?.length ?? 0) > 0;

  // Badge jumlah doa yang belum didoakan untuk petugas doa.
  const prayerQ = useQuery({ queryKey: ['prayer', 'summary'], queryFn: getPrayerSummary, staleTime: 60_000 });
  const pendingDoa = prayerQ.data?.isPetugas ? prayerQ.data.assignedPending : 0;

  const go = (href: string) => () => router.push(href as never);

  const tiles: QuickAccessTile[] = [
    { key: 'ibadah', icon: Church, label: t('quickaccess.ibadah'), onPress: go('/(tabs)/ibadah') },
    { key: 'event', icon: CalendarDays, label: t('quickaccess.event'), onPress: go('/(tabs)/event') },
    // Persembahan: web per-cabang (iOS Safari; Android in-app browser) —
    // halaman web punya tombol "Kembali ke Els App". Lihat utils/giving.ts.
    { key: 'persembahan', icon: HandHeart, label: t('quickaccess.persembahan'), onPress: () => void openGiving(viewingBranch?.kode) },
    { key: 'berita', icon: Newspaper, label: t('quickaccess.berita'), onPress: go('/content?tab=news') },

    { key: 'renungan', icon: BookOpen, label: t('quickaccess.renungan'), onPress: go('/content?tab=renungan') },
    { key: 'bible', icon: Sparkles, label: t('quickaccess.bible'), onPress: go('/bible') },
    {
      key: 'doa',
      icon: HandHelping,
      label: t('quickaccess.doa'),
      onPress: go(pendingDoa > 0 ? '/doa?tab=assigned' : '/doa'),
      badge: pendingDoa > 0 ? (pendingDoa > 99 ? '99+' : String(pendingDoa)) : undefined,
    },
    { key: 'resolusi', icon: Target, label: t('quickaccess.resolusi'), onPress: go('/resolusi') },

    { key: 'family', icon: Users, label: t('quickaccess.family'), onPress: go('/family') },
    { key: 'tamu', icon: UserPlus, label: t('quickaccess.tamu'), onPress: go('/profile/my-guests') },
    { key: 'group', icon: UsersRound, label: t('quickaccess.group'), onPress: go('/profile/my-groups') },
    // Homecell — untuk SEMUA jemaat (anggota: lihat; belum punya: cari & minta bergabung; PIC: kelola).
    { key: 'homecell', icon: House, label: t('quickaccess.homecell'), onPress: go('/homecell') },

    { key: 'ministry', icon: HeartHandshake, label: t('quickaccess.ministry'), onPress: go('/ministry') },
    ...(isPicArea ? [{ key: 'area', icon: MapPinned, label: t('quickaccess.area'), onPress: go('/area') }] : []),
    { key: 'visit', icon: Handshake, label: t('quickaccess.visit'), onPress: go('/visit') },
    { key: 'market', icon: Store, label: t('quickaccess.market'), onPress: go('/market') },
  ];

  // Lebar grid diukur langsung (bukan lebar window) supaya tetap benar di
  // web yang kontennya dibatasi max-width.
  const [gridWidth, setGridWidth] = useState(0);
  const cols = Math.max(MIN_COLS, Math.floor(gridWidth / MIN_TILE_WIDTH) || MIN_COLS);

  return (
    <View className="px-5 mt-4">
      <View
        className="flex-row flex-wrap"
        style={{ marginHorizontal: -4, rowGap: 12 }}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {tiles.map((tile) => (
          <View key={tile.key} style={{ width: `${100 / cols}%`, paddingHorizontal: 4 }}>
            <Tile tile={tile} />
          </View>
        ))}
      </View>
    </View>
  );
}

function Tile({ tile }: { tile: QuickAccessTile }) {
  const Icon = tile.icon;
  return (
    <Pressable onPress={tile.onPress} className="items-center" accessibilityRole="button" accessibilityLabel={tile.label}>
      <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center relative">
        <Icon size={22} color={ICON_COLOR} />
        {tile.badge ? (
          <View className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-red-500 min-w-[16px] items-center">
            <Text className="text-[8px] font-bold text-white">{tile.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[10px] font-semibold text-neutral-700 text-center mt-1.5" numberOfLines={2}>
        {tile.label}
      </Text>
    </Pressable>
  );
}
