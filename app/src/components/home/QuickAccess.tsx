import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Church,
  HandHeart,
  Handshake,
  HeartHandshake,
  MapPinned,
  Newspaper,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { useScannerEvents, useScannerIbadah } from '@/hooks/useScanner';
import { useManagedAreas, useManagedHomecells } from '@/hooks/useHomecell';

type QuickAccessTile = {
  key: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string; // mis. "BARU", "SOON"
  badgeBg?: string;
  badgeText?: string;
};

/**
 * Quick Access grid di dashboard.
 * Tiles tampil sesuai otoritas user:
 * - Selalu: Alkitab, Keluarga, Ibadah, Event, Berita, Persembahan, Marketplace (soon)
 * - Kalau authorized scanner: Scanner
 * - Kalau PIC homecell: Homecell
 * - Kalau PIC area: Area
 */
export function QuickAccess() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const scannerEventsQuery = useScannerEvents();
  const scannerIbadahQuery = useScannerIbadah();
  const isScannerAuthorized =
    (scannerEventsQuery.data?.length ?? 0) > 0 ||
    (scannerIbadahQuery.data?.length ?? 0) > 0;

  // Cek PIC homecell/area dari list yang BE return — kalau ada minimal 1,
  // user PIC di kategori itu.
  const homecellsQuery = useManagedHomecells();
  const areasQuery = useManagedAreas();
  const isPicHomecell = (homecellsQuery.data?.length ?? 0) > 0;
  const isPicArea = (areasQuery.data?.length ?? 0) > 0;

  // Brand orange theme — semua tile pakai warna sama supaya visual coherent.
  // Common — semua user
  const tiles: QuickAccessTile[] = [
    {
      key: 'ibadah',
      icon: Church,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.ibadah'),
      onPress: () => router.push('/(tabs)/ibadah'),
    },
    {
      key: 'event',
      icon: CalendarDays,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.event'),
      onPress: () => router.push('/(tabs)/event'),
    },
    {
      key: 'persembahan',
      icon: HandHeart,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.persembahan'),
      onPress: () => router.push('/(tabs)/persembahan'),
    },
    {
      key: 'berita',
      icon: Newspaper,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.berita'),
      onPress: () => router.push('/content?tab=news'),
    },
    {
      key: 'renungan',
      icon: BookOpen,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.renungan'),
      onPress: () => router.push('/content?tab=renungan'),
    },
    {
      key: 'family',
      icon: Users,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.family'),
      onPress: () => router.push('/family'),
    },
    {
      key: 'bible',
      icon: Sparkles,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.bible'),
      onPress: () => router.push('/bible'),
    },
    {
      key: 'calendar',
      icon: Calendar,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.calendar'),
      onPress: () => router.push('/calendar' as never),
    },
    {
      key: 'ministry',
      icon: HeartHandshake,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.ministry'),
      onPress: () => router.push('/ministry' as never),
    },
  ];

  // Conditional tiles berdasarkan otoritas — pakai filled brand-500 untuk
  // distinguish dari tile common (volunteer/PIC role visual cue)
  if (isScannerAuthorized) {
    tiles.unshift({
      key: 'scanner',
      icon: ScanLine,
      iconColor: '#fff',
      iconBg: 'bg-brand-500',
      label: t('quickaccess.scanner'),
      onPress: () => router.push('/scanner'),
    });
  }

  // Homecell + Area tiles — same flat style dengan tile lain (orange-50 outline).
  // No PIC badge — visual uniform, tetap di-conditional show sesuai authority.
  if (isPicHomecell) {
    tiles.push({
      key: 'homecell',
      icon: Users,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.homecell'),
      onPress: () => router.push('/homecell'),
    });
  }

  if (isPicArea) {
    tiles.push({
      key: 'area',
      icon: MapPinned,
      iconColor: '#EA580C',
      iconBg: 'bg-brand-50',
      label: t('quickaccess.area'),
      onPress: () => router.push('/area'),
    });
  }

  // Visit — pendataan jemaat yang bertemu jemaat lain (M14, BE patch 22b)
  tiles.push({
    key: 'visit',
    icon: Handshake,
    iconColor: '#EA580C',
    iconBg: 'bg-brand-50',
    label: t('quickaccess.visit'),
    onPress: () => router.push('/visit' as never),
  });

  // Marketplace (coming soon) — selalu di belakang
  tiles.push({
    key: 'marketplace',
    icon: ShoppingBag,
    iconColor: '#737373',
    iconBg: 'bg-neutral-100',
    label: t('quickaccess.marketplace'),
    onPress: () => showToast(t('quickaccess.coming_soon'), 'info'),
    disabled: true,
    badge: t('quickaccess.soon'),
    badgeBg: 'bg-neutral-300',
    badgeText: 'text-neutral-700',
  });

  return (
    <View className="px-5 mt-4">
      {/* Grid 4 kolom, wrap ke row baru kalau tiles > 4.
          Pakai flexBasis "25%" - gap supaya tiles auto-fit responsive.
          Title "Akses Cepat" sengaja di-hide — grid sudah self-evident. */}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4, rowGap: 12 }}>
        {tiles.map((tile) => (
          <View key={tile.key} style={{ width: '25%', paddingHorizontal: 4 }}>
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
    <Pressable onPress={tile.onPress} className="items-center">
      <View
        className={`w-14 h-14 rounded-2xl ${tile.iconBg} items-center justify-center relative ${
          tile.disabled ? 'opacity-60' : ''
        }`}
      >
        <Icon size={22} color={tile.iconColor} />
        {tile.badge ? (
          <View
            className={`absolute -top-1 -right-1 px-1 py-0.5 rounded-full ${
              tile.badgeBg ?? 'bg-red-500'
            }`}
          >
            <Text
              className={`text-[8px] font-bold ${tile.badgeText ?? 'text-white'}`}
            >
              {tile.badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        className="text-[10px] font-semibold text-neutral-700 text-center mt-1.5"
        numberOfLines={2}
      >
        {tile.label}
      </Text>
    </Pressable>
  );
}
