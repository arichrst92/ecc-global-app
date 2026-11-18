/**
 * Baris "Materi homecell" di kartu homecell / zona Beranda (2026-11).
 * Hanya tampil untuk pemimpin (server: isLeader) — selain itu null.
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FileText, Library } from 'lucide-react-native';

import { useMyHomecellMaterials } from '@/hooks/useHomecellMaterial';
import { nc } from '@/theme/ThemeRoot';

export function HomecellMaterialRow({ variant = 'homecell' }: { variant?: 'homecell' | 'zone' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useMyHomecellMaterials();
  const d = q.data;
  if (!d?.isLeader) return null;
  const current = d.current;
  if (variant === 'homecell' && !current.length && !d.newCount) return null;

  const title = variant === 'homecell' && current.length ? t('hcmat.this_week') : t('hcmat.title');
  const sub =
    variant === 'homecell' && current.length
      ? t('hcmat.files_topic', { count: current.length, judul: current[0]!.judul })
      : t('hcmat.zone_sub');

  return (
    <Pressable
      onPress={() => router.push('/homecell-material' as never)}
      className="flex-row items-center gap-2.5 mt-3 pt-3 border-t border-neutral-100"
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={4}
    >
      {variant === 'homecell' ? <FileText size={18} color="#EA580C" /> : <Library size={18} color="#EA580C" />}
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-bold text-neutral-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {d.newCount > 0 ? (
        <View className="bg-brand-500 px-2 py-0.5 rounded-full">
          <Text className="text-[10px] font-bold text-white">{t('hcmat.new_count', { count: d.newCount })}</Text>
        </View>
      ) : null}
      <ChevronRight size={16} color={nc('#A3A3A3')} />
    </Pressable>
  );
}
