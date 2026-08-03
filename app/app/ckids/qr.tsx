/**
 * CKids QR fullscreen — QR anak besar untuk stall pickup/redeem.
 *
 * Format QR: jemaat.kode 8-char (sama dgn profile QR jemaat).
 * Admin stall pakai ckids.eccchurch.global scan kode ini untuk lookup point
 * balance + validate redeem.
 *
 * Per BE notice ckids-mobile-tab 2026-08-01.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, ShoppingBag } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/ui/Avatar';
import { useMyChildrenGroupedBalances } from '@/hooks/useCKids';
import { useCKidsSelectionStore } from '@/stores/ckids-selection.store';

export default function CKidsQrScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const balancesQuery = useMyChildrenGroupedBalances();
  const selectedAnakId = useCKidsSelectionStore((s) => s.selectedAnakId);

  const selected =
    balancesQuery.data.find((b) => b.anak.id === selectedAnakId) ??
    balancesQuery.data[0] ??
    null;

  if (!selected) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Baby size={40} color="#F97316" />
          <Text className="text-base font-bold text-neutral-900 mt-3">
            {t('ckids.qr_no_child_title')}
          </Text>
          <Text className="text-sm text-neutral-500 mt-1 text-center">
            {t('ckids.qr_no_child_body')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalBalance = selected.totalBalance;
  const kode = selected.anak.kode;

  return (
    <View className="flex-1 bg-brand-500">
      <SafeAreaView edges={['top']}>
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="flex-1 ml-2">
            <Text className="text-white font-bold text-sm">
              {t('ckids.qr_screen_title')}
            </Text>
            <Text className="text-white/80 text-xs">
              {t('ckids.qr_screen_subtitle')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 48 }}
      >
        {/* Anak info */}
        <View className="items-center mb-6">
          <Avatar size={72} name={selected.anak.namaLengkap} fotoUrl={selected.anak.fotoUrl} />
          <Text className="text-white text-xl font-bold mt-3">
            {selected.anak.namaLengkap}
          </Text>
          <View className="flex-row items-baseline gap-1 mt-1">
            <Text className="text-white/90 text-2xl font-bold">{totalBalance}</Text>
            <Text className="text-white/80 text-sm">{t('ckids.points_unit')}</Text>
          </View>
        </View>

        {/* QR card */}
        <View className="bg-white rounded-3xl p-6 items-center" style={{ elevation: 12 }}>
          <QRCode value={kode} size={240} color="#0A0A0A" backgroundColor="#FFFFFF" />
          <Text className="text-2xl font-bold tracking-widest text-neutral-900 mt-5">
            {kode}
          </Text>
          <Text className="text-xs text-neutral-500 mt-1">{t('ckids.qr_kode_label')}</Text>
        </View>

        {/* Instruction */}
        <View className="mt-6 bg-white/15 rounded-2xl p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <ShoppingBag size={16} color="#fff" />
            <Text className="text-white font-bold text-sm">
              {t('ckids.qr_instruction_title')}
            </Text>
          </View>
          <Text className="text-white/90 text-xs leading-relaxed">
            {t('ckids.qr_instruction_body')}
          </Text>
        </View>

        {/* Per-cabang breakdown */}
        {selected.balances.length > 1 ? (
          <View className="mt-6 bg-white/15 rounded-2xl p-4">
            <Text className="text-white font-bold text-xs uppercase mb-2">
              {t('ckids.qr_balance_breakdown')}
            </Text>
            {selected.balances.map((b) => (
              <View
                key={b.cabang.id}
                className="flex-row items-center justify-between py-1.5"
              >
                <Text className="text-white/90 text-sm">{b.cabang.nama}</Text>
                <Text className="text-white font-bold text-sm">
                  {b.balance} {t('ckids.points_unit')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
