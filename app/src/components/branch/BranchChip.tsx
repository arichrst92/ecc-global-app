import { Pressable, Text, View } from 'react-native';
import { Church, ChevronsUpDown, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useViewingBranch } from '@/hooks/useViewingBranch';

type Props = {
  /** Variant: 'header' (white text on brand bg, untuk Home), 'inline' (dark text untuk tab headers) */
  variant?: 'header' | 'inline';
  onPress: () => void;
};

/**
 * Chip menampilkan cabang yang sedang di-view + indicator VIEW kalau != home.
 * Tap → buka BranchSwitcherSheet (parent yg handle state).
 */
export function BranchChip({ variant = 'header', onPress }: Props) {
  const { t } = useTranslation();
  const { branch, isHome, isLoading } = useViewingBranch();

  if (isLoading || !branch) return null;

  const isHeader = variant === 'header';

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-xl px-3 py-2.5 ${
        isHeader ? 'bg-white/10' : 'bg-white border border-neutral-200'
      } ${!isHome ? (isHeader ? 'border border-amber-300' : 'border-amber-400') : ''}`}
    >
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center ${
          isHeader ? 'bg-white/15' : 'bg-brand-50'
        }`}
      >
        {isHome ? (
          <Church size={16} color={isHeader ? '#fff' : '#EA580C'} />
        ) : (
          <MapPin size={16} color={isHeader ? '#fff' : '#D97706'} />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={`text-[10px] uppercase tracking-wider font-bold ${
            isHeader ? 'text-white/70' : 'text-neutral-500'
          }`}
        >
          {t('branch.active_label')}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text
            className={`text-sm font-semibold ${isHeader ? 'text-white' : 'text-neutral-900'}`}
            numberOfLines={1}
          >
            {branch.nama}
          </Text>
          {!isHome ? (
            <View className="bg-amber-300 px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-amber-900">VIEW</Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronsUpDown size={16} color={isHeader ? 'rgba(255,255,255,0.7)' : '#737373'} />
    </Pressable>
  );
}
