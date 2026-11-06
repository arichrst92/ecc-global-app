/**
 * Ikon + warna aksen ministry (dipilih admin di Portal → Pelayanan → Ubah).
 * Daftar ikon SAMA dengan PELAYANAN_IKON di core-platform (shared-types) &
 * Portal. Kosong / tidak dikenal (server / app lama) → tangan-hati oranye ECC.
 */
import { Text, View } from 'react-native';
import {
  Baby,
  BookOpen,
  Brush,
  Camera,
  Car,
  Church,
  Clapperboard,
  ClipboardList,
  Coffee,
  Drum,
  Flame,
  Flower2,
  Globe,
  GraduationCap,
  Guitar,
  HandHeart,
  HandHelping,
  Headphones,
  Heart,
  HeartHandshake,
  Lightbulb,
  Megaphone,
  Mic,
  Monitor,
  Music,
  Palette,
  PenTool,
  Piano,
  Radio,
  Shield,
  Smile,
  Sparkles,
  Speaker,
  Star,
  Sun,
  Users,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  'heart-handshake': HeartHandshake,
  camera: Camera,
  video: Video,
  clapperboard: Clapperboard,
  monitor: Monitor,
  radio: Radio,
  music: Music,
  mic: Mic,
  guitar: Guitar,
  drum: Drum,
  piano: Piano,
  headphones: Headphones,
  speaker: Speaker,
  lightbulb: Lightbulb,
  palette: Palette,
  brush: Brush,
  'pen-tool': PenTool,
  'flower-2': Flower2,
  'hand-helping': HandHelping,
  'hand-heart': HandHeart,
  users: Users,
  baby: Baby,
  smile: Smile,
  heart: Heart,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  church: Church,
  flame: Flame,
  sparkles: Sparkles,
  sun: Sun,
  star: Star,
  coffee: Coffee,
  utensils: Utensils,
  car: Car,
  shield: Shield,
  'clipboard-list': ClipboardList,
  megaphone: Megaphone,
  globe: Globe,
};

export const MINISTRY_WARNA = {
  orange: { solid: '#F97316', bg: '#FFEDD5', fg: '#C2410C' },
  amber: { solid: '#F59E0B', bg: '#FEF3C7', fg: '#B45309' },
  rose: { solid: '#F43F5E', bg: '#FFE4E6', fg: '#BE123C' },
  pink: { solid: '#EC4899', bg: '#FCE7F3', fg: '#BE185D' },
  violet: { solid: '#8B5CF6', bg: '#EDE9FE', fg: '#6D28D9' },
  sky: { solid: '#0EA5E9', bg: '#E0F2FE', fg: '#0369A1' },
  teal: { solid: '#14B8A6', bg: '#CCFBF1', fg: '#0F766E' },
  green: { solid: '#22C55E', bg: '#DCFCE7', fg: '#15803D' },
} as const;

export function ministryWarna(warna?: string | null) {
  return MINISTRY_WARNA[(warna ?? '') as keyof typeof MINISTRY_WARNA] ?? MINISTRY_WARNA.orange;
}

export function ministryIconComponent(ikon?: string | null): LucideIcon {
  return (ikon && ICONS[ikon]) || HeartHandshake;
}

/** Kotak ikon berwarna. `onHero` = di atas header oranye (latar putih transparan). */
export function MinistryIcon({
  ikon,
  warna,
  size = 40,
  onHero = false,
}: {
  ikon?: string | null;
  warna?: string | null;
  size?: number;
  onHero?: boolean;
}) {
  const Icon = ministryIconComponent(ikon);
  const w = ministryWarna(warna);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: onHero ? 'rgba(255,255,255,0.22)' : w.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.round(size * 0.5)} color={onHero ? '#FFFFFF' : w.fg} />
    </View>
  );
}

/** Chip kecil: ikon + nama ministry (mis. di jadwal / petugas). */
export function MinistryChip({ nama, ikon, warna }: { nama: string; ikon?: string | null; warna?: string | null }) {
  const Icon = ministryIconComponent(ikon);
  const w = ministryWarna(warna);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: w.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Icon size={11} color={w.fg} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: w.fg }} numberOfLines={1}>
        {nama}
      </Text>
    </View>
  );
}

/** Baris pertama deskripsi = tagline (diisi admin di Portal). */
export function taglineOf(deskripsi: string | null | undefined): string | null {
  const first = (deskripsi ?? '').split('\n').map((x) => x.trim()).find(Boolean);
  return first ?? null;
}
