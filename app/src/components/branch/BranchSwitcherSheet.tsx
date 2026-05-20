import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Church, Info, MapPin, X } from 'lucide-react-native';

import { useBranches } from '@/hooks/useBranches';
import { useBranchStore } from '@/stores/branch.store';
import { useViewingBranch, useHomeBranch } from '@/hooks/useViewingBranch';
import type { Cabang } from '@/types/cabang';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Bottom sheet untuk pilih cabang yang sedang di-view.
 * Section 1: Cabang Home (default) dengan badge HOME.
 * Section 2: Cabang Lain (semua cabang aktif lain).
 */
export function BranchSwitcherSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const branchesQuery = useBranches();
  const homeBranchQuery = useHomeBranch();
  const { viewingCabangId } = useViewingBranch();
  const setViewing = useBranchStore((s) => s.setViewingCabang);

  const homeId = homeBranchQuery.data?.id;
  const allBranches = branchesQuery.data ?? [];
  const homeBranch = allBranches.find((b) => b.id === homeId) ?? null;
  const otherBranches = allBranches.filter((b) => b.id !== homeId);

  function handleSelect(cabangId: string) {
    // Kalau pilih home → reset (null state)
    if (cabangId === homeId) {
      setViewing(null);
    } else {
      setViewing(cabangId);
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable
          onPress={() => {}}
          className="bg-white rounded-t-3xl"
          // minHeight supaya sheet tidak collapse ke title saja di iOS,
          // maxHeight 85% biar gak full-screen nutupin status bar
          style={{ minHeight: 420, maxHeight: '85%' }}
        >
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <View className="items-center pt-3">
              <View className="w-10 h-1 bg-neutral-300 rounded-full" />
            </View>
            <View className="flex-row items-start justify-between px-5 pt-3 pb-2">
              <View className="flex-1 pr-3">
                <Text className="font-bold text-lg text-neutral-900">{t('branch.switcher_title')}</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{t('branch.switcher_sub')}</Text>
              </View>
              <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center -mt-1">
                <X size={18} color="#737373" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              className="px-5"
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Home branch */}
              {homeBranch ? (
                <>
                  <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-3 mb-2">
                    {t('branch.home_section')}
                  </Text>
                  <BranchOption
                    branch={homeBranch}
                    isHome
                    isSelected={!viewingCabangId || viewingCabangId === homeId}
                    onPress={() => handleSelect(homeBranch.id)}
                  />
                </>
              ) : null}

              {/* Other branches */}
              {otherBranches.length > 0 ? (
                <>
                  <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-4 mb-2">
                    {t('branch.other_section')}
                  </Text>
                  <View className="gap-2">
                    {otherBranches.map((b) => (
                      <BranchOption
                        key={b.id}
                        branch={b}
                        isHome={false}
                        isSelected={viewingCabangId === b.id}
                        onPress={() => handleSelect(b.id)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {/* Info notice */}
              <View className="mt-4 mb-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex-row gap-2">
                <Info size={14} color="#1d4ed8" style={{ marginTop: 2 }} />
                <Text className="text-xs text-blue-800 flex-1">
                  {t('branch.switcher_notice')}
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BranchOption({
  branch,
  isHome,
  isSelected,
  onPress,
}: {
  branch: Cabang;
  isHome: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`p-3 rounded-2xl border-2 flex-row items-center gap-3 ${
        isSelected
          ? isHome
            ? 'border-brand-500 bg-brand-50'
            : 'border-amber-500 bg-amber-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center ${
          isHome ? 'bg-brand-100' : 'bg-neutral-100'
        }`}
      >
        {isHome ? <Church size={18} color="#EA580C" /> : <MapPin size={18} color="#525252" />}
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {branch.nama}
          </Text>
          {isHome ? (
            <View className="bg-brand-500 px-1.5 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-white">HOME</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
          {branch.alamat}
        </Text>
      </View>
      {isSelected ? (
        <CheckCircle2 size={20} color={isHome ? '#F97316' : '#F59E0B'} />
      ) : null}
    </Pressable>
  );
}
