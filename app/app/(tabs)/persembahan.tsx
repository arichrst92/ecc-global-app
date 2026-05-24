import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  ChevronsUpDown,
  Copy,
  HandHeart,
  HeartHandshake,
  Home as HomeIcon,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react-native';

import { BranchSwitcherSheet } from '@/components/branch/BranchSwitcherSheet';
import { ViewingBanner } from '@/components/branch/ViewingBanner';
import { GuestPlaceholderView } from '@/components/GuestPlaceholderView';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import { useRekening } from '@/hooks/useRekening';
import { useViewingBranch } from '@/hooks/useViewingBranch';
import { env } from '@/config/env';
import type { Rekening } from '@/types/rekening';

/** Map purpose keyword ke icon untuk visual hint */
function purposeIcon(purpose: string): React.ReactNode {
  const p = purpose.toLowerCase();
  if (p.includes('pembangunan') || p.includes('building'))
    return <Building2 size={20} color="#fff" />;
  if (p.includes('diakonia') || p.includes('charity'))
    return <HeartHandshake size={20} color="#fff" />;
  if (p.includes('misi') || p.includes('mission'))
    return <Sparkles size={20} color="#fff" />;
  return <HandHeart size={20} color="#fff" />;
}

export default function PersembahanTab() {
  // Guard di luar — rules-of-hooks safe. Rekening API butuh auth
  // (/admin/cabang/:id/rekening), tidak available untuk guest sampai BE
  // rilis /public/cabang/:id/rekening.
  const isGuest = useAuthStore((s) => s.isGuest);
  const { t } = useTranslation();
  if (isGuest) {
    return (
      <GuestPlaceholderView
        icon={<HandHeart size={48} color="#EA580C" />}
        title={t('nav.persembahan')}
        description={t('guest.persembahan_description')}
        readOnlyHint={t('guest.persembahan_readonly_hint')}
      />
    );
  }
  return <PersembahanTabAuthenticated />;
}

function PersembahanTabAuthenticated() {
  const { t } = useTranslation();
  const { branch, isHome, isLoading: branchLoading } = useViewingBranch();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [qrisRekening, setQrisRekening] = useState<Rekening | null>(null);

  const query = useRekening();

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-5 py-3 flex-row items-center gap-3">
          <HandHeart size={20} color="#171717" />
          <View className="flex-1">
            <Text className="text-lg font-bold text-neutral-900">{t('persembahan.title')}</Text>
            {branch ? (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {branch.nama}
                </Text>
                {!isHome ? (
                  <View className="bg-amber-100 px-1.5 py-0.5 rounded-full">
                    <Text className="text-[9px] font-bold text-amber-700">VIEW</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => setSwitcherOpen(true)}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronsUpDown size={18} color="#EA580C" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ViewingBanner />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#F97316"
          />
        }
      >
        {query.isPending || branchLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#F97316" />
          </View>
        ) : query.isError ? (
          <View className="items-center py-16 px-8">
            <Text className="text-sm text-red-600 text-center mb-3">{t('error.generic')}</Text>
            <Pressable
              onPress={() => query.refetch()}
              className="px-4 py-2 bg-brand-500 rounded-lg"
            >
              <Text className="text-white font-semibold text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (query.data?.length ?? 0) === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center mb-3">
              <HomeIcon size={28} color="#A3A3A3" />
            </View>
            <Text className="text-lg font-semibold text-neutral-700">
              {t('persembahan.empty_title')}
            </Text>
            <Text className="text-sm text-neutral-500 text-center mt-1">
              {t('persembahan.empty_msg')}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {(query.data ?? []).map((r) => (
              <RekeningCard key={r.id} rekening={r} onShowQris={() => setQrisRekening(r)} />
            ))}
          </View>
        )}
      </ScrollView>

      <BranchSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      {/* QRIS modal */}
      <Modal
        visible={!!qrisRekening}
        transparent
        animationType="fade"
        onRequestClose={() => setQrisRekening(null)}
      >
        <Pressable
          onPress={() => setQrisRekening(null)}
          className="flex-1 bg-black/70 items-center justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-3xl p-5 w-full max-w-sm">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-xs text-neutral-500 uppercase tracking-wider">QRIS</Text>
                <Text className="text-lg font-bold text-neutral-900">
                  {qrisRekening?.purpose}
                </Text>
              </View>
              <Pressable
                onPress={() => setQrisRekening(null)}
                className="w-8 h-8 items-center justify-center"
              >
                <X size={18} color="#737373" />
              </Pressable>
            </View>
            {qrisRekening?.qrisImageUrl ? (
              <View className="items-center">
                <Image
                  source={{ uri: `${env.apiBaseUrl}${qrisRekening.qrisImageUrl}` }}
                  style={{ width: 260, height: 260 }}
                  resizeMode="contain"
                />
                <Text className="text-xs text-neutral-500 mt-3">{t('persembahan.qris_hint')}</Text>
              </View>
            ) : (
              <Text className="text-sm text-neutral-500 text-center py-8">
                {t('persembahan.no_qris')}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function RekeningCard({
  rekening,
  onShowQris,
}: {
  rekening: Rekening;
  onShowQris: () => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);

  async function copyAccountNumber() {
    await Clipboard.setStringAsync(rekening.bankNomor);
    showToast(t('common.copied'), 'success');
  }

  return (
    <View className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      {/* Purpose header */}
      <View className="bg-brand-500 px-4 py-3 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
          {purposeIcon(rekening.purpose)}
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-bold">{rekening.purpose}</Text>
          {rekening.catatan ? (
            <Text className="text-white/80 text-xs mt-0.5" numberOfLines={2}>
              {rekening.catatan}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Bank info */}
      <View className="p-4 gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center">
            <Text className="font-bold text-blue-600 text-sm">{rekening.bankNama}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-500">{t('common.account_name')}</Text>
            <Text className="font-semibold text-neutral-900" numberOfLines={1}>
              {rekening.bankAtasNama}
            </Text>
          </View>
        </View>

        <View className="border-t border-neutral-100 pt-3">
          <Text className="text-xs text-neutral-500">{t('common.account_number')}</Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="font-mono text-lg font-bold text-neutral-900">
              {rekening.bankNomor}
            </Text>
            <Pressable
              onPress={copyAccountNumber}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-brand-50 rounded-lg"
            >
              <Copy size={14} color="#EA580C" />
              <Text className="text-xs font-semibold text-brand-600">{t('common.copy')}</Text>
            </Pressable>
          </View>
        </View>

        {rekening.qrisImageUrl ? (
          <Pressable
            onPress={onShowQris}
            className="border-t border-neutral-100 pt-3 flex-row items-center gap-2"
          >
            <QrCode size={16} color="#EA580C" />
            <Text className="text-sm font-semibold text-brand-600 flex-1">
              {t('persembahan.show_qris')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
