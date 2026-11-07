import { Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useViewingBranch } from '@/hooks/useViewingBranch';
import { useBranchStore } from '@/stores/branch.store';
import { gx } from '@/theme/gradient';

/**
 * Persistent strip banner kalau user sedang viewing cabang lain (bukan home).
 * Render di top screen (di bawah header, di atas konten).
 * `safeTop` = banner berada paling atas layar → beri jarak status bar
 * (sinyal / baterai / notch) supaya tidak tertutup.
 */
export function ViewingBanner({ safeTop = false }: { safeTop?: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { branch, isHome } = useViewingBranch();
  const resetToHome = useBranchStore((s) => s.resetToHome);

  if (isHome || !branch) return null;

  return (
    <View
      {...gx('bg-brand-500 px-4 pb-2 flex-row items-center gap-2 border-b border-white/20', { paddingTop: (safeTop ? insets.top : 0) + 8 })}
    >
      <MapPin size={14} color="#fff" />
      <Text className="text-xs text-white flex-1" numberOfLines={1}>
        <Text className="text-white font-bold">{t('branch.viewing_label')}:</Text> {branch.nama}
      </Text>
      <Pressable onPress={() => resetToHome()} className="bg-white/20 px-2 py-1 rounded-md">
        <Text className="text-xs text-white font-semibold">{t('branch.back_home')}</Text>
      </Pressable>
    </View>
  );
}
