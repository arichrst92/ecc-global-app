import { Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useViewingBranch } from '@/hooks/useViewingBranch';
import { useBranchStore } from '@/stores/branch.store';

/**
 * Persistent strip banner kalau user sedang viewing cabang lain (bukan home).
 * Render di top screen (di bawah header, di atas konten).
 */
export function ViewingBanner() {
  const { t } = useTranslation();
  const { branch, isHome } = useViewingBranch();
  const resetToHome = useBranchStore((s) => s.resetToHome);

  if (isHome || !branch) return null;

  return (
    <View className="bg-amber-500 px-4 py-2 flex-row items-center gap-2">
      <MapPin size={14} color="#fff" />
      <Text className="text-xs text-white flex-1" numberOfLines={1}>
        <Text className="font-bold">{t('branch.viewing_label')}:</Text> {branch.nama}
      </Text>
      <Pressable onPress={() => resetToHome()} className="bg-white/20 px-2 py-1 rounded-md">
        <Text className="text-xs text-white font-semibold">{t('branch.back_home')}</Text>
      </Pressable>
    </View>
  );
}
